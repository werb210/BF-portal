// BF_PORTAL_v930_MAYA_REPORTS - "Ask Maya for a report" (HubSpot parity): type a question, Maya adds a card - an existing
// report, or a live Maya table (BF-Server /api/reports/ask and /api/reports/maya-table). Tables refresh every minute
// while they are on screen and whenever the Dashboard opens.
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

export type MayaTableSpec = { title: string; object: "applications" | "contacts"; group_by: string; measure: "count" | "total_amount"; days: number | null };
export type AskAnswer =
  | { kind: "catalog"; report: string; title: string; days: number | null }
  | { kind: "table"; spec: MayaTableSpec }
  | { kind: "none"; message: string };

const input: CSSProperties = { flex: "1 1 320px", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)" };

export function AskMayaForReport({ silo, onCard }: { silo: string; onCard: (a: Exclude<AskAnswer, { kind: "none" }>) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true); setNote(null);
    try {
      const r = await api.post<AskAnswer & { data?: AskAnswer }>("/api/reports/ask", { question: q.trim(), silo });
      const a = ((r as { data?: AskAnswer })?.data ?? r) as AskAnswer;
      if (a?.kind === "catalog" || a?.kind === "table") { onCard(a); setQ(""); }
      else setNote(a?.message ?? "Maya could not build that report.");
    } catch { setNote("Maya could not be reached. Try again in a moment."); } finally { setBusy(false); }
  };
  return (
    <div data-testid="ask-maya-report" style={{ display: "grid", gap: 6, marginBottom: 10 }}>
      <label htmlFor="ask-maya-report-q" style={{ fontWeight: 600, color: "var(--ui-text)" }}>Ask Maya for a report</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input id="ask-maya-report-q" style={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void ask(); }}
          placeholder="e.g. applications by product this quarter, or contacts by lead status" />
        <button type="button" className="ui-button ui-button--primary" disabled={busy || !q.trim()} onClick={() => void ask()}>{busy ? "Building..." : "Add to Dashboard"}</button>
      </div>
      {note && <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--ui-text-muted)" }}>{note}</p>}
    </div>
  );
}

type TableData = { title: string; columns: [string, string]; rows: Array<{ label: string; value: number }>; measure: "count" | "total_amount"; refreshed_at: string };

export function MayaTableCard({ spec, silo }: { spec: MayaTableSpec; silo: string }) {
  const [data, setData] = useState<TableData | null>(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(spec);
  useEffect(() => {
    let alive = true;
    const load = () => api.get<TableData>(`/api/reports/maya-table?silo=${encodeURIComponent(silo)}&spec=${encodeURIComponent(key)}`)
      .then((d) => { if (alive) { setData(d); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    void load();
    const t = setInterval(() => { void load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [key, silo]);
  if (failed && !data) return <p style={{ color: "var(--ui-text-muted)" }}>This table could not be loaded.</p>;
  if (!data) return <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>;
  const fmt = (n: number) => (data.measure === "total_amount" ? n.toLocaleString(undefined, { style: "currency", currency: "CAD", maximumFractionDigits: 0 }) : n.toLocaleString());
  return (
    <div data-testid="maya-table">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, color: "var(--ui-text)" }}>
        <thead><tr>{data.columns.map((c, i) => <th key={c} style={{ textAlign: i ? "right" : "left", padding: "6px 4px", borderBottom: "1px solid var(--ui-border)", color: "var(--ui-text-muted)", fontWeight: 600 }}>{c}</th>)}</tr></thead>
        <tbody>
          {data.rows.length === 0 ? <tr><td colSpan={2} style={{ padding: 8, color: "var(--ui-text-muted)" }}>Nothing to show yet.</td></tr> : data.rows.map((r) => (
            <tr key={r.label}><td style={{ padding: "6px 4px", borderBottom: "1px solid var(--ui-border)" }}>{r.label}</td><td style={{ padding: "6px 4px", textAlign: "right", borderBottom: "1px solid var(--ui-border)", fontWeight: 600 }}>{fmt(r.value)}</td></tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ui-text-muted)" }}>Live - updated {new Date(data.refreshed_at).toLocaleTimeString()}{spec.days ? `, last ${spec.days} days` : ", all time"}</p>
    </div>
  );
}
