// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type Analytics = {
  enrolled: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  completed: number;
  stopped: number;
  paused: number;
};

type Sequence = { id: string; name: string };

const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "-");

export default function AnalyticsTab() {
  const [seqs, setSeqs] = useState<Sequence[]>([]);
  const [seqId, setSeqId] = useState<string>("");
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api<{ sequences: Sequence[] }>("/api/v1/bi/marketing/sequences");
        setSeqs(r.sequences || []);
      } catch {
        setSeqs([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const qs = seqId ? `?sequence_id=${seqId}` : "";
      try {
        const r = await api<{ analytics: Analytics }>(`/api/v1/bi/marketing/analytics${qs}`);
        setData(r.analytics);
      } catch {
        setData(null);
      }
    })();
  }, [seqId]);

  const cards = data ? [
    { label: "Enrolled",  value: data.enrolled,  sub: undefined },
    { label: "Sent",      value: data.sent,      sub: pct(data.sent, data.enrolled) },
    { label: "Delivered", value: data.delivered, sub: pct(data.delivered, data.sent) },
    { label: "Opened",    value: data.opened,    sub: pct(data.opened, data.delivered) },
    { label: "Clicked",   value: data.clicked,   sub: pct(data.clicked, data.opened) },
    { label: "Replied",   value: data.replied,   sub: pct(data.replied, data.delivered) },
    { label: "Completed", value: data.completed, sub: undefined },
    { label: "Paused",    value: data.paused,    sub: undefined },
    { label: "Stopped",   value: data.stopped,   sub: undefined },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium">Analytics</h3>
        <select value={seqId} onChange={(e) => setSeqId(e.target.value)} className="rounded border border-card bg-brand-surface px-2 py-1 text-sm text-white">
          <option value="">All sequences</option>
          {seqs.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      </div>
      {!data ? (
        <p className="text-white/60">Loading...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="bg-brand-bgAlt border border-card rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-widest text-white/50">{c.label}</div>
              <div className="text-2xl font-semibold text-white mt-1">{c.value}</div>
              {c.sub && <div className="text-xs text-white/40">{c.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
