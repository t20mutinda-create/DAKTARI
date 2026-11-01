"use client";

import { COUNTIES, DEMO_CASES, isLumpy, useCases } from "@/lib/store";

const W = 640;
const H = 520;
const LON = [34.6, 37.9];
const LAT = [-2.1, 1.4];
const px = (lon: number) => 40 + ((lon - LON[0]) / (LON[1] - LON[0])) * (W - 80);
const py = (lat: number) => 40 + ((LAT[1] - lat) / (LAT[1] - LAT[0])) * (H - 80);

export default function MapPage() {
  const mine = useCases().map((c) => ({ county: c.county, condition: c.condition, source: "you" as const }));

  const all = [...DEMO_CASES, ...mine];
  const byCounty = Object.keys(COUNTIES)
    .map((name) => {
      const here = all.filter((c) => c.county === name);
      const lumpy = here.filter((c) => isLumpy(c.condition)).length;
      return { name, total: here.length, lumpy, alert: lumpy >= 3 };
    })
    .filter((c) => c.total > 0);
  const alerts = byCounty.filter((c) => c.alert);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Outbreak map</h1>
      <p className="mt-1 text-stone-600">
        Every checked animal becomes a data point. Clusters of suspected notifiable disease are flagged for the vet office.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]">
          <rect width={W} height={H} rx="16" fill="#f5f5f4" />
          {byCounty.map((c) => {
            const { lat, lon } = COUNTIES[c.name];
            const r = 12 + 5 * Math.min(c.total, 6);
            return (
              <g key={c.name}>
                <circle cx={px(lon)} cy={py(lat)} r={r} fill={c.alert ? "#dc2626" : "#f59e0b"} fillOpacity="0.75" />
                <text x={px(lon)} y={py(lat) + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
                  {c.total}
                </text>
                <text x={px(lon)} y={py(lat) + r + 14} textAnchor="middle" fontSize="12" fill="#44403c">
                  {c.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 space-y-2">
        {alerts.length === 0 && <p className="text-sm text-stone-500">No clusters flagged yet.</p>}
        {alerts.map((a) => (
          <p key={a.name} className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
            <strong>Cluster alert:</strong> {a.lumpy} suspected lumpy skin disease cases in {a.name}. Notify the county
            veterinary office.
          </p>
        ))}
      </div>

      <p className="mt-6 text-xs text-stone-500">
        Demo data is shown together with the cases you checked in this browser. Circle size is the number of cases and red
        means a cluster of three or more suspected lumpy skin disease cases.
      </p>
    </main>
  );
}
