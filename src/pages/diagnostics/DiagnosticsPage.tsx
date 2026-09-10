// BF_PORTAL_DIAGNOSTICS_API_PREFIX_v4 - every call here was missing /api.
// apiClient prepends the server origin only; it does not add a prefix, so
// all four tabs requested the origin root and rendered Route not found.
// BF_PORTAL_DIAGNOSTICS_v1
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { apiClient } from "@/api/client";
import Skeleton from "@/components/Skeleton";

type Tab = "ads" | "queue" | "funnel" | "failures";
type AdTerm = { search_term: string; cost: string; clicks: number; impressions: number; conversions: string; cost_per_conversion?: string | null };
type AdsData = { windowDays: number; totalCost: number; wastedCost: number; wastedShare: number | null; totalConversions: number; worstOffenders: AdTerm[]; whatWorks: AdTerm[]; keywords?: AdTerm[] };
type JobQueue = { summary: Array<{ type: string; status: string; count: string; oldest: string; max_attempts: string }>; claimableNow: Array<{ type: string; count: string }>; stuck: Array<{ id: string; type: string; status: string; error: string | null; attempts: string; created_at: string }> };
type Funnel = { attempted: number; completed: number; completionRate: number | null; byStatus: Record<string, number> };
type Failures = { grouped: Array<{ error: string; count: string; latest: string }>; recent: Array<{ id: string; phone: string | null; business_name: string | null; status: string; error: string | null }> };

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number | null) => value == null ? "—" : `${(value * 100).toFixed(1)}%`;
const th: CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 12, textTransform: "uppercase", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" };
const td: CSSProperties = { padding: "8px 12px", borderBottom: "1px solid var(--ui-border)", fontSize: 13 };
const card: CSSProperties = { background: "var(--ui-surface-strong)", borderRadius: 8, padding: 16, marginBottom: 16 };

function Stat({ label, value, alarm }: { label: string; value: string; alarm?: boolean }) {
  return <div style={{ ...card, flex: "1 1 180px", marginBottom: 0 }}><div style={{ fontSize: 12, color: "var(--ui-text-muted)", textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 26, fontWeight: 600, color: alarm ? "#b00020" : "var(--ui-text)" }}>{value}</div></div>;
}
function TableCard({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) {
  return <section style={card}><h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{headers.map((header) => <th key={header} style={th}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>;
}

export default function DiagnosticsPage() {
  const [tab, setTab] = useState<Tab>("ads");
  const [days, setDays] = useState(90);
  const [data, setData] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (tab === "ads") {
      const [waste, keywords] = await Promise.all([
        apiClient.get<AdsData>(`/api/marketing/ad-waste?days=${days}`),
        apiClient.get<AdTerm[] | { keywords: AdTerm[] }>(`/api/marketing/ad-keywords?days=${days}`),
      ]);
      return { ...waste, keywords: Array.isArray(keywords) ? keywords : keywords.keywords };
    }
    if (tab === "queue") return apiClient.get<JobQueue>("/api/_int/job-queue");
    if (tab === "funnel") return apiClient.get<Funnel>(`/api/admin/submit-funnel?days=${days}`);
    return apiClient.get<Failures>(`/api/admin/submit-failures?days=${days}`);
  }, [tab, days]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null); setData(null);
    load().then((result) => { if (!cancelled) setData(result); }).catch((error: unknown) => { if (!cancelled) setErr(error instanceof Error ? error.message : "Request failed."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  const tabs: Array<[Tab, string]> = [["ads", "Ad waste"], ["queue", "Job queue"], ["funnel", "Submit funnel"], ["failures", "Submit failures"]];
  return <div style={{ padding: 24 }} data-testid="diagnostics-page">
    <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Diagnostics</h1>
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} data-testid={`diag-tab-${id}`} aria-pressed={tab === id} style={{ padding: "6px 14px", borderRadius: 6, cursor: "pointer", border: "1px solid var(--ui-border)", background: tab === id ? "var(--ui-accent, #0B1F3A)" : "var(--ui-surface-strong)", color: tab === id ? "#fff" : "var(--ui-text)" }}>{label}</button>)}
      {tab !== "queue" && <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Window in days" style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>{[7, 30, 90, 180].map((value) => <option key={value} value={value}>{value} days</option>)}</select>}
    </div>
    {loading && <Skeleton />}
    {err && <div style={{ ...card, color: "#b00020" }} data-testid="diag-error">{err}</div>}
    {!loading && !err && data != null && tab === "ads" && <AdsPanel data={data as AdsData} />}
    {!loading && !err && data != null && tab === "queue" && <QueuePanel data={data as JobQueue} />}
    {!loading && !err && data != null && tab === "funnel" && <FunnelPanel data={data as Funnel} />}
    {!loading && !err && data != null && tab === "failures" && <FailuresPanel data={data as Failures} />}
  </div>;
}

function AdsPanel({ data }: { data: AdsData }) {
  const rows = (title: string, terms: AdTerm[], empty: string) => <TableCard title={title} headers={["Search term", "Cost", "Clicks", "Conversions"]}>{terms.map((row, index) => <tr key={`${row.search_term}-${index}`}><td style={td}>{row.search_term}</td><td style={td}>{money(row.cost)}</td><td style={td}>{row.clicks}</td><td style={td}>{row.conversions}</td></tr>)}{terms.length === 0 && <tr><td style={td} colSpan={4}>{empty}</td></tr>}</TableCard>;
  return <><div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}><Stat label="Total spend" value={money(data.totalCost)} /><Stat label="Converted nothing" value={money(data.wastedCost)} alarm /><Stat label="Wasted share" value={pct(data.wastedShare)} alarm={(data.wastedShare ?? 0) > 0.5} /><Stat label="Conversions" value={String(data.totalConversions ?? 0)} /></div>{rows("Worst offenders — cost with zero conversions", data.worstOffenders ?? [], "No zero-conversion spend in this window.")}{rows("What works", data.whatWorks ?? [], "Nothing converted in this window.")}{rows("All ad keywords", data.keywords ?? [], "No keyword data in this window.")}</>;
}
function QueuePanel({ data }: { data: JobQueue }) {
  return <><TableCard title="Queue by type and status" headers={["Type", "Status", "Count", "Oldest", "Max attempts"]}>{(data.summary ?? []).map((row, index) => <tr key={index}><td style={td}>{row.type}</td><td style={td}>{row.status}</td><td style={td}>{row.count}</td><td style={td}>{row.oldest ? new Date(row.oldest).toLocaleString() : "—"}</td><td style={td}>{row.max_attempts}</td></tr>)}{(data.summary ?? []).length === 0 && <tr><td style={td} colSpan={5}>Queue is empty.</td></tr>}</TableCard><TableCard title="Stuck over an hour" headers={["Type", "Status", "Attempts", "Created", "Error"]}>{(data.stuck ?? []).map((row) => <tr key={row.id}><td style={td}>{row.type}</td><td style={td}>{row.status}</td><td style={td}>{row.attempts}</td><td style={td}>{new Date(row.created_at).toLocaleString()}</td><td style={{ ...td, color: "#b00020" }}>{row.error ?? "—"}</td></tr>)}{(data.stuck ?? []).length === 0 && <tr><td style={td} colSpan={5}>Nothing stuck. The queue is moving.</td></tr>}</TableCard></>;
}
function FunnelPanel({ data }: { data: Funnel }) {
  return <><div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}><Stat label="Tapped submit" value={String(data.attempted ?? 0)} /><Stat label="Arrived" value={String(data.completed ?? 0)} /><Stat label="Completion rate" value={pct(data.completionRate)} alarm={(data.completionRate ?? 1) < 0.8} /></div><TableCard title="By status" headers={["Status", "Count"]}>{Object.entries(data.byStatus ?? {}).map(([status, count]) => <tr key={status}><td style={td}>{status}</td><td style={td}>{count}</td></tr>)}</TableCard></>;
}
function FailuresPanel({ data }: { data: Failures }) {
  return <><TableCard title="Why submits failed" headers={["Error", "Count", "Latest"]}>{(data.grouped ?? []).map((row, index) => <tr key={index}><td style={td}>{row.error}</td><td style={td}>{row.count}</td><td style={td}>{row.latest ? new Date(row.latest).toLocaleString() : "—"}</td></tr>)}{(data.grouped ?? []).length === 0 && <tr><td style={td} colSpan={3}>No failed submits in this window.</td></tr>}</TableCard><TableCard title="Recent — callable" headers={["Business", "Phone", "Status", "Error"]}>{(data.recent ?? []).map((row) => <tr key={row.id}><td style={td}>{row.business_name ?? "—"}</td><td style={td}>{row.phone ? <a href={`tel:${row.phone}`} style={{ color: "var(--ui-link, #0B1F3A)" }}>{row.phone}</a> : "—"}</td><td style={td}>{row.status}</td><td style={{ ...td, color: "#b00020" }}>{row.error ?? "—"}</td></tr>)}{(data.recent ?? []).length === 0 && <tr><td style={td} colSpan={4}>Nobody stuck mid-submit.</td></tr>}</TableCard></>;
}
