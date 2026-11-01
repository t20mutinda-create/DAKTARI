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

type Note = { message: string; escalate: boolean };

export default function CasesPage() {
  const cases = useCases();
  const day = useDemoDay();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [error, setError] = useState<string | null>(null);

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
    setBusy(c.id);
    setError(null);
    try {
      const blob = await resizeImage(file);
      const last = c.visits[c.visits.length - 1];
      const t = await postTriage(blob, "", summarizeVisit(last));
      const thumb = await blobToDataUrl(await resizeImage(blob, 240, 0.7));
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
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="mt-1 text-stone-600">Daktari follows each case until it is resolved.</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">Demo day {day}</div>
          <button onClick={fastForward} className="mt-1 rounded-full bg-stone-900 px-3 py-1 text-white">
            Fast-forward 1 day
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {cases.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
          No cases yet. Check an animal first and it will appear here.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {cases.map((c) => {
          const last = c.visits[c.visits.length - 1];
          const due = day >= nextCheckInDay(c);
          const note = notes[c.id];
          return (
            <section key={c.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{c.animal}</h2>
                  <p className="text-sm text-stone-500">
                    {c.county} · {c.condition}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${URGENCY[last.urgency].badge}`}>
                  {URGENCY[last.urgency].label}
                </span>
              </div>

              <ol className="mt-4 space-y-3">
                {c.visits.map((v, i) => (
                  <li key={i} className="flex gap-3">
                    <img src={v.thumb} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <div className="text-sm">
                      <div className="font-semibold">
                        Day {v.day} · {URGENCY[v.urgency].label}
                      </div>
                      <div className="text-stone-600">{v.headline}</div>
                      {v.noduleCount !== null && (
                        <div className="text-xs text-stone-500">
                          {v.noduleCount} regions · about {v.affectedPercent}% affected
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {note && (
                <p
                  className={`mt-4 rounded-xl p-3 text-sm ${
                    note.escalate ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {note.message}
                </p>
              )}

              {due && (
                <div className="mt-4 rounded-xl bg-stone-100 p-4 text-sm">
                  <p className="font-semibold">Daktari check-in · day {day}</p>
                  <p className="mt-1">How is {c.animal} today? Please send a new photo of the same area.</p>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busy === c.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) followUp(c, f);
                      e.target.value = "";
                    }}
                    className="mt-2 block w-full text-sm"
                  />
                  {busy === c.id && <p className="mt-2 text-stone-500">Measuring and comparing…</p>}
                </div>
              )}

              <button
                onClick={() => navigator.clipboard.writeText(c.triage.vet_handoff_note)}
                className="mt-4 text-sm font-medium text-emerald-700 underline"
              >
                Copy latest note for the vet
              </button>
            </section>
          );
        })}
      </div>

      {cases.length > 0 && (
        <button onClick={reset} className="mt-8 text-sm text-stone-500 underline">
          Reset demo
        </button>
      )}
    </main>
  );
}
