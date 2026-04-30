// BI_PGI_ALIGNMENT_v56 — dashboard placeholder; rich stats arrive in v57.
import { useEffect, useState } from "react";
import { api } from "@/api";

type Summary = { total_applications: number; in_internal_review: number; quoted: number; bound: number; declined: number };

export default function BIDashboard() {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => {
    api<Summary>("/api/v1/bi/reports/summary").then(setS).catch(() => setS({ total_applications: 0, in_internal_review: 0, quoted: 0, bound: 0, declined: 0 }));
  }, []);
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-5">
        {[["Total", s?.total_applications], ["Internal review", s?.in_internal_review], ["Quoted", s?.quoted], ["Bound", s?.bound], ["Declined", s?.declined]].map(([label, v]) => (
          <div key={String(label)} className="bg-brand-surface border border-card rounded-xl p-4">
            <div className="text-xs uppercase text-white/60">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{v ?? "–"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
