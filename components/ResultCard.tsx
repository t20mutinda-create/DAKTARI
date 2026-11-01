import { URGENCY } from "@/lib/types";
import type { Triage } from "@/lib/types";

export default function ResultCard({ t }: { t: Triage }) {
  const urgency = URGENCY[t.urgency];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Assessment</h2>
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${urgency.badge}`}>
          {urgency.label}
        </span>
      </div>
      <p className="mt-3 font-medium">{t.headline}</p>
      {t.possible_conditions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Possible causes to discuss with a vet</h3>
          <ul className="mt-1 list-inside list-disc text-sm text-stone-700">
            {t.possible_conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 rounded-xl bg-stone-100 p-3 text-sm">{t.recommended_action}</p>
      {typeof t.segmented_lesion_regions === "number" && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          SAM 3.1 segmented {t.segmented_lesion_regions} visible skin-lesion region
          {t.segmented_lesion_regions === 1 ? "" : "s"}. This is image segmentation, not a diagnosis.
        </p>
      )}
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Note for the vet</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{t.vet_handoff_note}</p>
      </div>
      <p className="mt-4 text-xs text-stone-500">
        This is triage support, not a diagnosis. Contact a veterinarian for an examination.
      </p>
    </section>
  );
}
