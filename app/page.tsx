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
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Check an animal</h1>
      <p className="mt-1 text-stone-600">
        Photo-based livestock health triage for dairy farmers. Triage support only. A vet must examine the animal.
      </p>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium">Photo of the animal</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm"
        />
        {SAMPLES.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.path}
                onClick={() => chooseSample(s.path)}
                className="rounded-full border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {preview && (
          <img src={preview} alt="Selected animal" className="mt-4 max-h-72 w-full rounded-xl object-cover" />
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Animal name</label>
            <input
              value={animal}
              onChange={(e) => setAnimal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">County</label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-sm"
            >
              {Object.keys(COUNTIES).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium">What have you noticed? (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="e.g. lumps appeared two days ago, eating less"
          className="mt-1 w-full rounded-xl border border-stone-300 p-3 text-sm"
        />

        <button
          onClick={onCheck}
          disabled={!file || loading}
          className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Measuring and checking…" : "Check"}
        </button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <ResultCard t={result} />
          {saved && (
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              Case saved. Next check-in: day {nextCheckInDay(saved)}.{" "}
              <Link href="/cases" className="font-semibold underline">
                Open cases
              </Link>
            </p>
          )}
        </div>
      )}
    </main>
  );
}
