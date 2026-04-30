// BI_PGI_ALIGNMENT_v56 — Apollo marketing placeholder; full UI in follow-up block.
import { useEffect, useState } from "react";
import { api } from "@/api";

type Summary = { window_days: number; counts: Record<string, number>; by_icp?: unknown[]; by_sequence?: unknown[] };

export default function BIMarketing() {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => { api<Summary>("/api/v1/bi/marketing/engagement-summary").then(setS).catch(() => setS(null)); }, []);
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Marketing</h2>
      <p className="text-white/70 mb-4">Apollo backend is wired (sequences, replies queue, mailbox health). Full dashboard UI lands in v57.</p>
      {s && (
        <div className="grid gap-4 md:grid-cols-5">
          {Object.entries(s.counts).map(([k, v]) => (
            <div key={k} className="bg-brand-surface border border-card rounded-xl p-4">
              <div className="text-xs uppercase text-white/60">{k.replace(/_/g, " ")}</div>
              <div className="mt-2 text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
