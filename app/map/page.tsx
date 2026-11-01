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
    <main className="min-h-[calc(100vh-7rem)] bg-amber-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-900">County overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Animal cases map</h1>
        <p className="mt-2 max-w-xl leading-7 text-stone-700">
          This map shows checked animals by county. Clusters of suspected animal disease are flagged for the county vet.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-amber-200 bg-white p-2 shadow-sm sm:p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]">
            <rect width={W} height={H} rx="16" fill="#fef3c7" />
            {byCounty.map((c) => {
              const { lat, lon } = COUNTIES[c.name];
              const r = 12 + 5 * Math.min(c.total, 6);
              return (
                <g key={c.name}>
                  <circle cx={px(lon)} cy={py(lat)} r={r} fill={c.alert ? "#b91c1c" : "#166534"} fillOpacity="0.85" />
                  <text x={px(lon)} y={py(lat) + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
                    {c.total}
                  </text>
                  <text x={px(lon)} y={py(lat) + r + 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#292524">
                    {c.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 space-y-2">
          {alerts.length === 0 && <p className="text-sm font-medium text-stone-700">No clusters flagged yet.</p>}
          {alerts.map((a) => (
            <p key={a.name} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
              <strong>Cluster alert:</strong> {a.lumpy} suspected lumpy skin disease cases among cattle in {a.name}.
              Notify the county veterinary office.
            </p>
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-amber-200 bg-white/70 p-4 text-sm leading-6 text-stone-700">
          Demo data is shown together with animal cases checked in this browser. Circle size shows the number of cases;
          red marks a cluster of three or more suspected lumpy skin disease cases.
        </p>
      </div>
    </main>
  );
}
