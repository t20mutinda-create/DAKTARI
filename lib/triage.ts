import OpenAI from "openai";
import { parseImageStream, recordsOfKind } from "@meta-sam/parser";
import type { Region, Triage, Urgency } from "@/lib/types";

const urgencies: Urgency[] = ["monitor", "vet_visit", "isolate_and_report"];

type ModelAssessment = Omit<
  Triage,
  "segmented_lesion_regions" | "segmented_lesion_boxes" | "segmentation_frame_width" | "segmentation_frame_height"
> & {
  segment_skin_lesions: boolean;
};

type Box = { x1: number; y1: number; x2: number; y2: number; w?: number; h?: number; c?: number };

function shouldSegmentSkinLesions(assessment: Omit<ModelAssessment, "segment_skin_lesions">): boolean {
  const mentionsSkinLesions = [
    assessment.headline,
    ...assessment.possible_conditions,
    assessment.recommended_action,
    assessment.vet_handoff_note,
  ].some((text) => /\b(skin|lump|bump|nodule|lesion|lumpy|dermat|pox|papilloma|demod|wart)\b/i.test(text));

  return (
    (assessment.nodule_count ?? 0) > 0 ||
    (assessment.affected_percent ?? 0) > 0 ||
    mentionsSkinLesions
  );
}

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

async function countSkinLesionRegions(
  client: OpenAI,
  image: Buffer,
  mimeType: string,
  frameWidth: number | null,
  frameHeight: number | null
): Promise<{ count: number; boxes: Region[] }> {
  console.log('[Meta API] sam-3.1 segmenting "lump or bump on the animal\'s skin"');
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
  const boxes: Box[] = [];
  for (const box of recordsOfKind(result.records, "box")) {
    boxes.push({
      x1: box.left,
      y1: box.top,
      x2: box.right - 1,
      y2: box.bottom - 1,
      w: frameWidth ?? undefined,
      h: frameHeight ?? undefined,
      c: box.confidence,
    });
  }
  return {
    count: recordsOfKind(result.records, "mask").length,
    boxes: boxes.map(({ x1, y1, x2, y2 }) => ({ x1, y1, x2, y2 })),
  };
}

// Segmentation can only increase the urgency, never reduce it.
const NODULE_ALERT_COUNT = 3;

export function applySafetyNet(triage: Triage): Triage {
  const safeAction = triage.urgency === "isolate_and_report"
    ? "Isolate the animal, do not move or sell animals, restrict visitors, and contact a vet or the county veterinary office."
    : "Contact a vet or the county veterinary office.";
  const safeTriage = { ...triage, recommended_action: safeAction };
  const regionCount = Math.max(triage.nodule_count ?? 0, triage.segmented_lesion_regions ?? 0);
  if (regionCount < NODULE_ALERT_COUNT || triage.urgency === "isolate_and_report") {
    return safeTriage;
  }

  return {
    ...safeTriage,
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

const TIER_ACTIONS: Record<Urgency, string> = {
  monitor: "Keep the animal where you can check it every day. Take a new photo in 2 to 3 days in daylight from the same angle. Call a vet if it gets worse, stops eating, or new lumps or swelling appear.",
  vet_visit: "Arrange for a vet to examine the animal within 1 to 2 days, or the same day if it is off feed, lying down, or the udder is hot and swollen. Note when the signs started and what has changed, and take a new photo each day.",
  isolate_and_report: "Separate the animal from the herd, do not move or sell animals from the farm, limit visitors and shared equipment, and report to your vet or the county veterinary office today.",
};

export async function runTriage(
  image: Buffer,
  mimeType: string,
  description: string,
  previous: string,
  frameSize: { width: number; height: number } | null = null
): Promise<Triage> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not configured on the server.");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.meta.ai/v1",
  });
  console.log("[Meta API] muse-spark-1.3 reasoning over the photo and the measurements");
  const response = await client.chat.completions.create({
    model: process.env.MODEL_TRIAGE_MODEL ?? "muse-spark-1.3",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You provide cautious livestock photo triage support, not a diagnosis. Identify visible signs only. " +
          "Animals only. Never give treatment, drug, dosing or home-care advice and never name medicines. In recommended_action you may only say to isolate the animal, not move or sell animals, restrict visitors, and contact a vet or the county veterinary office. " +
          "Use isolate_and_report for suspected highly contagious or notifiable disease; vet_visit when examination is needed; " +
          "otherwise monitor. Give conservative advice and recommend contacting a veterinarian for concerning signs. " +
          "Return JSON with urgency (monitor, vet_visit, isolate_and_report), headline, possible_conditions (string array), " +
          "recommended_action: one short sentence (it will be replaced by standard steps; never give treatment advice), " +
          "vet_handoff_note, nodule_count (number or null), affected_percent (0-100 or null). " +
          "Also include segment_skin_lesions (boolean): set true when visible raised lumps, nodules, bumps, or other " +
          "skin changes could benefit from pixel segmentation, including small, distant, subtle, or uncertain lesions. " +
          "If any possible condition involves skin lesions, set this to true rather than skipping segmentation. " +
          "Only estimate nodule count and affected percent " +
          "when skin lesions are clearly visible; otherwise use null.\n\n" +
          "Cattle reference context (supporting distinctions, not diagnoses):\n" +
          "- Lumpy skin concern: choose isolate_and_report only when several distinct raised nodules are visible, or when machine measurements show 3 or more nodule-like regions. If the signs are crusting, hair loss or redness, or one or two uncertain lumps without several distinct nodules, choose vet_visit and list lumpy skin disease as a possibility to rule out. If any raised lumps are visible, never choose monitor.\n" +
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

  console.log(
    `[Meta API] muse-spark-1.3 done: ${response.usage?.prompt_tokens ?? "?"} input tokens, ${response.usage?.completion_tokens ?? "?"} output tokens`
  );
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
  const segmentation = segment_skin_lesions || shouldSegmentSkinLesions(assessment)
    ? await countSkinLesionRegions(
        client,
        image,
        mimeType,
        frameSize?.width ?? null,
        frameSize?.height ?? null
      )
    : null;

  const result = applySafetyNet({
    ...assessment,
    segmented_lesion_regions: segmentation?.count ?? null,
    segmented_lesion_boxes: segmentation?.boxes ?? null,
    segmentation_frame_width: frameSize?.width ?? null,
    segmentation_frame_height: frameSize?.height ?? null,
  });
  return { ...result, recommended_action: TIER_ACTIONS[result.urgency] };
}
