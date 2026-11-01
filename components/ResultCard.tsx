import Image from "next/image";
import { URGENCY } from "@/lib/types";
import type { Triage } from "@/lib/types";

export default function ResultCard({ t, imageUrl }: { t: Triage; imageUrl?: string }) {
  const urgency = URGENCY[t.urgency];
  const boxes = t.segmented_lesion_boxes;
  const frameWidth = t.segmentation_frame_width;
  const frameHeight = t.segmentation_frame_height;
  const measurementsUnavailable =
    t.nodule_count === null && t.affected_percent === null && t.segmented_lesion_regions === null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-emerald-950">Assessment</h2>
        <span className={`rounded-full border px-3 py-2 text-sm font-bold ${urgency.badge}`}>
          {urgency.label}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold leading-7 text-stone-900">{t.headline}</p>
      {t.possible_conditions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-emerald-950">Possible causes to discuss with a vet</h3>
          <ul className="mt-1 list-inside list-disc text-sm leading-6 text-stone-800">
            {t.possible_conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 rounded-xl border-l-4 border-orange-700 bg-orange-50 p-4 text-sm font-medium leading-6 text-stone-900">
        {t.recommended_action}
      </p>
      {typeof t.segmented_lesion_regions === "number" && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
          SAM 3.1 segmented {t.segmented_lesion_regions} visible skin-lesion region
          {t.segmented_lesion_regions === 1 ? "" : "s"}. This is an image measurement, not a veterinary examination.
        </p>
      )}
      {measurementsUnavailable && (
        <p className="mt-3 text-xs font-medium text-stone-700">Measurement unavailable for this animal photo.</p>
      )}
      {imageUrl && boxes && boxes.length > 0 && frameWidth && frameHeight && (
        <div className="mt-4">
          <div className="relative">
            <Image
              src={imageUrl}
              alt="Photo with SAM-detected skin regions"
              width={frameWidth}
              height={frameHeight}
              unoptimized
              className="block h-auto w-full rounded-xl"
            />
            <svg
              viewBox={`0 0 ${frameWidth} ${frameHeight}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {boxes.map((box, index) => (
                <rect
                  key={index}
                  x={box.x1}
                  y={box.y1}
                  width={box.x2 - box.x1 + 1}
                  height={box.y2 - box.y1 + 1}
                  fill="rgba(220,38,38,0.15)"
                  stroke="#dc2626"
                  strokeWidth={Math.max(2, frameWidth / 300)}
                />
              ))}
            </svg>
          </div>
          <p className="mt-1 text-xs text-stone-700">Red boxes show regions SAM 3.1 measured on the animal.</p>
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-emerald-950">Note for the vet</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-800">{t.vet_handoff_note}</p>
      </div>
      <p className="mt-4 border-t border-amber-100 pt-3 text-xs leading-5 text-stone-700">
        Triage support only. Contact a veterinarian to examine the animal.
      </p>
    </section>
  );
}
