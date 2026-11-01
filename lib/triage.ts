import OpenAI from "openai";
import { parseImageStream, recordsOfKind } from "@meta-sam/parser";
import type { Triage, Urgency } from "@/lib/types";

const urgencies: Urgency[] = ["monitor", "vet_visit", "isolate_and_report"];

type ModelAssessment = Omit<Triage, "segmented_lesion_regions"> & {
  segment_skin_lesions: boolean;
};

function isModelAssessment(value: unknown): value is ModelAssessment {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.urgency === "string" &&
    urgencies.includes(result.urgency as Urgency) &&
    typeof result.headline === "string" &&
    Array.isArray(result.possible_conditions) &&
    result.possible_conditions.every((condition) => typeof condition === "string") &&
    typeof result.recommended_action === "string" &&
    typeof result.vet_handoff_note === "string" &&
    (result.nodule_count === null || typeof result.nodule_count === "number") &&
    (result.affected_percent === null || typeof result.affected_percent === "number") &&
    typeof result.segment_skin_lesions === "boolean"
  );
}

async function countSkinLesionRegions(client: OpenAI, image: Buffer, mimeType: string): Promise<number> {
  const stream = await client.responses.create({
    model: process.env.MODEL_SEGMENTATION_MODEL ?? "sam-3.1",
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "lump or bump on the animal's skin" },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${image.toString("base64")}`,
            detail: "auto",
          },
        ],
      },
    ],
    metadata: { mask_encoding: "one_bit" },
    stream: true,
  });

  const result = await parseImageStream(stream).finalResult;
  if (result.outcome.status !== "completed") {
    throw new Error("SAM 3.1 did not complete skin-lesion segmentation.");
  }
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) {
    throw new Error(`SAM 3.1 could not parse its segmentation result: ${errors[0].message}`);
  }
  return recordsOfKind(result.records, "mask").length;
}

// Segmentation can only increase the urgency, never reduce it.
const NODULE_ALERT_COUNT = 3;

export function applySafetyNet(triage: Triage): Triage {
  const regionCount = Math.max(triage.nodule_count ?? 0, triage.segmented_lesion_regions ?? 0);
  if (regionCount < NODULE_ALERT_COUNT || triage.urgency === "isolate_and_report") {
    return triage;
  }

  return {
    ...triage,
    urgency: "isolate_and_report",
    headline: "Multiple nodule-like regions detected; isolate and report",
    recommended_action: [
      "Separate the animal from the rest of the herd.",
      "Do not move or sell animals from the farm.",
      "Call your vet or county veterinary office today.",
    ].join(" "),
    vet_handoff_note: [
      `The photo assessment measured ${regionCount} nodule-like regions. This is not a diagnosis.`,
      triage.vet_handoff_note,
    ].filter(Boolean).join(" "),
  };
}

export async function runTriage(
  image: Buffer,
  mimeType: string,
  description: string,
  previous: string
): Promise<Triage> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not configured on the server.");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.meta.ai/v1",
  });
  const response = await client.chat.completions.create({
    model: process.env.MODEL_TRIAGE_MODEL ?? "muse-spark-1.3",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You provide cautious livestock photo triage support, not a diagnosis. Identify visible signs only. " +
          "Use isolate_and_report for suspected highly contagious or notifiable disease; vet_visit when examination is needed; " +
          "otherwise monitor. Give conservative advice and recommend contacting a veterinarian for concerning signs. " +
          "Return JSON with urgency (monitor, vet_visit, isolate_and_report), headline, possible_conditions (string array), " +
          "recommended_action, vet_handoff_note, nodule_count (number or null), affected_percent (0-100 or null). " +
          "Also include segment_skin_lesions (boolean): set true when visible raised lumps, nodules, or bumps on the " +
          "animal's skin could benefit from pixel segmentation, including small or distant lesions; otherwise false. " +
          "Only estimate nodule count and affected percent " +
          "when skin lesions are clearly visible; otherwise use null.\n\n" +
          "Cattle reference context (supporting distinctions, not diagnoses):\n" +
          "- Lumpy skin concern: if machine measurements show 3 or more nodule-like regions, treat it as several nodules. " +
          "If any raised lumps are visible, never choose monitor. If unsure whether a lump is a nodule, choose isolate_and_report.\n" +
          "- Mastitis concern increases from abnormal milk, to quarter inflammation, to systemic illness signs.\n" +
          "- Pseudo-lumpy-skin lesions may be superficial with depressed centers and heal without deep scars.\n" +
          "- Papillomatosis may cause rough, wart-like growths, often on young cattle's head, neck, or shoulders.\n" +
          "- Hives may appear rapidly as soft, widespread, itchy raised welts.\n" +
          "- Demodicosis may cause slow-growing nodules with hair loss, scaling, or crusting.\n" +
          "- Udder edema may cause symmetrical swelling while milk remains normal.\n" +
          "- Mammillitis or pseudocowpox may affect teat skin while milk remains unaffected.\n" +
          "- Udder trauma may cause localized swelling and pink or red milk.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Farmer observations: ${description || "none provided"}\nPrevious check-in: ${previous || "none"}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${image.toString("base64")}` },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("The triage service returned no assessment.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The triage service returned malformed assessment data.");
  }
  if (!isModelAssessment(parsed)) throw new Error("The triage service returned an incomplete assessment.");

  const { segment_skin_lesions, ...assessment } = parsed;
  const segmentedLesionRegions = segment_skin_lesions
    ? await countSkinLesionRegions(client, image, mimeType)
    : null;

  return applySafetyNet({ ...assessment, segmented_lesion_regions: segmentedLesionRegions });
}
