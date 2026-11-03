"use client";

import { useState } from "react";
import {
  assessTrend,
  blobToDataUrl,
  makeVisit,
  nextCheckInDay,
  postTriage,
  resetDemo,
  resizeImage,
  saveCases,
  setDay,
  summarizeVisit,
  useCases,
  useDemoDay,
} from "@/lib/store";
import { URGENCY } from "@/lib/types";
import type { Case } from "@/lib/types";
import { useTriageProgress } from "@/lib/useTriageProgress";

type Note = { message: string; escalate: boolean };

export default function CasesPage() {
  const cases = useCases();
  const day = useDemoDay();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [error, setError] = useState<string | null>(null);
  const { label: progressLabel, reset: resetProgress } = useTriageProgress(busy !== null);

  function fastForward() {
    const next = day + 1;
    setDay(next);
  }

  function reset() {
    if (!confirm("Delete all cases and reset the demo clock?")) return;
    resetDemo();
    setNotes({});
  }

  async function followUp(c: Case, file: File) {
    resetProgress();
    setBusy(c.id);
    setError(null);
    try {
      const blob = await resizeImage(file);
      const last = c.visits[c.visits.length - 1];
      const t = await postTriage(blob, "", summarizeVisit(last));
      const thumb = await blobToDataUrl(await resizeImage(blob, 240, 0.7, 1));
      const visit = makeVisit(day, t, thumb);
      const verdict = assessTrend(last, visit);
      const updated = cases.map((x) =>
        x.id === c.id
          ? { ...x, visits: [...x.visits, visit], triage: t, condition: t.possible_conditions[0] ?? x.condition }
          : x
      );
      saveCases(updated);
      setNotes((n) => ({ ...n, [c.id]: { message: verdict.message, escalate: verdict.escalate } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-amber-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-900">Your herd</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Cases</h1>
            <p className="mt-1 text-stone-700">Follow each animal’s check-ins and changes over time.</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm sm:block sm:text-right">
            <div className="font-bold text-emerald-950">Demo day {day}</div>
            <button
              onClick={fastForward}
              className="min-h-11 rounded-lg bg-orange-800 px-4 py-2 font-semibold text-white transition hover:bg-orange-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-950"
            >
              Fast-forward 1 day
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-900">{error}</p>}

        {cases.length === 0 && (
          <p className="mt-8 rounded-2xl border-2 border-dashed border-amber-300 bg-white/70 p-6 text-center text-stone-700">
            No animal cases yet. Check an animal first and it will appear here.
          </p>
        )}

        <div className="mt-6 space-y-5">
          {cases.map((c) => {
            const last = c.visits[c.visits.length - 1];
            const due = day >= nextCheckInDay(c);
            const note = notes[c.id];
            return (
              <section key={c.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-950">{c.animal}</h2>
                    <p className="text-sm text-stone-700">
                      {c.county} · {c.condition}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-2 text-sm font-bold ${URGENCY[last.urgency].badge}`}>
                    {URGENCY[last.urgency].label}
                  </span>
                </div>

                <ol className="mt-4 space-y-3">
                  {c.visits.map((v, i) => (
                    <li key={i} className="flex gap-3 rounded-xl bg-amber-50 p-3">
                      <img src={v.thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 text-sm">
                        <div className="font-bold text-emerald-950">
                          Day {v.day} · {URGENCY[v.urgency].label}
                        </div>
                        <div className="mt-0.5 text-stone-800">{v.headline}</div>
                        {v.noduleCount !== null && (
                          <div className="mt-1 text-xs font-medium text-stone-700">
                            {v.noduleCount} regions · about {v.affectedPercent}% affected
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {note && (
                  <p
                    className={`mt-4 rounded-xl border p-3 text-sm font-medium ${
                      note.escalate ? "border-red-200 bg-red-50 text-red-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"
                    }`}
                  >
                    {note.message}
                  </p>
                )}

                {due && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <p className="font-bold text-emerald-950">Daktari check-in · day {day}</p>
                    <p className="mt-1 text-stone-800">How is {c.animal} today? Please send a new photo of the same area.</p>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={busy === c.id}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) followUp(c, f);
                        e.target.value = "";
                      }}
                      className="mt-3 block min-h-12 w-full rounded-xl border border-stone-300 bg-white p-2 text-sm text-stone-800 file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-4 file:py-2 file:font-semibold file:text-white"
                    />
                    {busy === c.id && (
                      <p role="status" className="mt-2 font-semibold text-emerald-950">
                        {progressLabel}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => navigator.clipboard.writeText(c.triage.vet_handoff_note)}
                  className="mt-4 min-h-11 rounded-lg px-3 text-sm font-bold text-emerald-900 underline underline-offset-2 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                >
                  Copy latest note for the vet
                </button>
              </section>
            );
          })}
        </div>

        {cases.length > 0 && (
          <button
            onClick={reset}
            className="mt-8 min-h-11 rounded-lg px-3 text-sm font-semibold text-stone-700 underline underline-offset-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Reset demo
          </button>
        )}
      </div>
    </main>
  );
}
