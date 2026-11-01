"use client";

import Link from "next/link";
import { useState } from "react";
import ResultCard from "@/components/ResultCard";
import {
  COUNTIES,
  blobToDataUrl,
  getDay,
  loadCases,
  newCase,
  nextCheckInDay,
  postTriage,
  resizeImage,
  saveCases,
} from "@/lib/store";
import type { Case, Triage } from "@/lib/types";

// Put sample photos in the public/samples folder. Leave the list empty to hide the buttons.
const SAMPLES: { label: string; path: string }[] = [
  { label: "Sample: skin nodules", path: "/samples/lsd.jpg" },
  { label: "Sample: swollen udder", path: "/samples/mastitis.jpg" },
];

export default function CheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [animal, setAnimal] = useState("Cow 1");
  const [county, setCounty] = useState("Nakuru");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Triage | null>(null);
  const [saved, setSaved] = useState<Case | null>(null);

  function pick(f: File | null) {
    setFile(f);
    setResult(null);
    setSaved(null);
    setError(null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function chooseSample(path: string) {
    const res = await fetch(path);
    if (!res.ok) {
      setError("Sample image not found. Add it to the public/samples folder.");
      return;
    }
    const blob = await res.blob();
    pick(new File([blob], "sample.jpg", { type: blob.type || "image/jpeg" }));
  }

  async function onCheck() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(null);
    try {
      const blob = await resizeImage(file);
      const t = await postTriage(blob, description);
      const thumb = await blobToDataUrl(await resizeImage(blob, 240, 0.7));
      const c = newCase(animal, county, getDay(), t, thumb);
      saveCases([c, ...loadCases()]);
      setResult(t);
      setSaved(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-amber-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-900">Daktari · animal care</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Check an animal</h1>
        <p className="mt-2 max-w-xl text-base leading-7 text-stone-700">
          Take a photo of the animal, measure visible regions, then follow clear next steps with your vet.
        </p>

        <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-emerald-950 sm:gap-3 sm:text-sm">
          {["Photo", "Measure", "Next steps"].map((step, index) => (
            <li key={step} className="rounded-xl border border-amber-200 bg-white/80 px-2 py-3 sm:px-3">
              <span className="mr-1.5 text-orange-800">0{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-emerald-950">Start with a clear animal photo</h2>
          <label className="mt-4 block text-sm font-semibold text-stone-800">Photo of the animal</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="mt-2 block min-h-12 w-full rounded-xl border border-stone-300 bg-amber-50 p-2 text-sm text-stone-800 file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-emerald-800"
          />
          {SAMPLES.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.path}
                  onClick={() => chooseSample(s.path)}
                  className="min-h-11 rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-950 transition hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-800"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {preview && (
            <img src={preview} alt="Selected animal" className="mt-4 max-h-72 w-full rounded-xl object-cover" />
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-stone-800">Animal name</label>
              <input
                value={animal}
                onChange={(e) => setAnimal(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-stone-400 bg-white px-3 text-base text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800">County</label>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-xl border border-stone-400 bg-white px-3 text-base text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                {Object.keys(COUNTIES).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold text-stone-800">What have you noticed? (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. lumps appeared two days ago, eating less"
            className="mt-1 w-full rounded-xl border border-stone-400 bg-white p-3 text-base text-stone-950 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          />

          <button
            onClick={onCheck}
            disabled={!file || loading}
            className="mt-5 min-h-12 w-full rounded-xl bg-emerald-900 px-4 py-3 text-base font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Working…" : "Check this animal"}
          </button>
          {loading && (
            <p role="status" className="mt-3 text-center text-sm font-semibold text-emerald-950">
              Measuring… Reasoning…
            </p>
          )}
          {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-900">{error}</p>}
        </div>

        {result && (
          <div className="mt-6 space-y-4">
            <ResultCard t={result} imageUrl={preview ?? undefined} />
            {saved && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                Case saved. Next check-in: day {nextCheckInDay(saved)}.{" "}
                <Link href="/cases" className="font-bold text-emerald-900 underline underline-offset-2">
                  Open cases
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
