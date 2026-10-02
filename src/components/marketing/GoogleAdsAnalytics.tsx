// BF_PORTAL_GOOGLE_ADS_ANALYTICS_v707
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { apiClient } from "@/api/client";

const card: CSSProperties = { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 16 };
const th: CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "8px 10px", fontSize: 13, color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border)", verticalAlign: "top" };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13 };
const select: CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" };

export const money = (v: number | null | undefined) => v == null ? "-" : "$" + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
export const roasText = (v: number | null | undefined) => v == null ? "-" : Number(v).toFixed(2) + "x";
export const duration = (ms: number | null | undefined) => {
  const seconds = Math.round(Number(ms ?? 0) / 1000);
  if (!seconds) return "-";
  return seconds >= 60 ? Math.floor(seconds / 60) + "m " + seconds % 60 + "s" : seconds + "s";
};

function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    apiClient.get<T>(url).then((response) => { if (!cancelled) setData(response); })
      .catch((error: unknown) => { if (!cancelled) setErr(error instanceof Error ? error.message : "Request failed."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);
  return { data, err, loading };
}

function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: string | false }) {
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead><tr>{headers.map((header) => <th key={header} style={th}>{header}</th>)}</tr></thead>
    <tbody>{children}{empty ? <tr><td style={td} colSpan={headers.length}>{empty}</td></tr> : null}</tbody>
  </table></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={{ ...card, marginBottom: 0, flex: "1 1 140px" }}><div style={{ fontSize: 12, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div><div style={{ fontSize: 22, fontWeight: 600, color: "var(--ui-text)", marginTop: 4 }}>{value}</div></div>;
}

function Days({ value, onChange, options = [30, 90, 180, 365] }: { value: number; onChange: (days: number) => void; options?: number[] }) {
  return <select aria-label="Window in days" value={value} onChange={(event) => onChange(Number(event.target.value))} style={select}>{options.map((days) => <option key={days} value={days}>Last {days} days</option>)}</select>;
}

type StoryRow = { key: string; spend: number | null; clicks: number | null; people: number; started: number; submitted: number; qualified: number; funded: number; fundedAmount: number; commission: number; roas: number | null; costPerSubmit: number | null };
type Story = { commissionRate: number; spendAvailable: boolean; rows: StoryRow[]; totals: Omit<StoryRow, "key" | "costPerSubmit"> };

export function AdsStoryPanel() {
  const [days, setDays] = useState(90);
  const [by, setBy] = useState("campaign");
  const { data, err, loading } = useLoad<Story>("/api/marketing/ads-story?days=" + days + "&by=" + by);
  const total = data?.totals;
  const heading = by === "ad_group" ? "Ad group" : by === "ad" ? "Ad" : by === "keyword" ? "Keyword" : "Campaign";
  return <section style={card} data-testid="ads-story">
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 16, color: "var(--ui-text)" }}>The story: ad to dollars</h3><select aria-label="Group by" value={by} onChange={(event) => setBy(event.target.value)} style={{ ...select, marginLeft: "auto" }}><option value="campaign">By campaign</option><option value="ad_group">By ad group</option><option value="ad">By ad</option><option value="keyword">By keyword</option></select><Days value={days} onChange={setDays} /></div>
    {loading && <p style={muted}>Loading...</p>}{err && <p role="alert" style={{ color: "#b3261e" }}>{err}</p>}
    {!loading && !err && data && total && <><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}><Stat label="Spend" value={money(total.spend)} /><Stat label="Ad clicks" value={String(total.clicks ?? 0)} /><Stat label="People in CRM" value={String(total.people)} /><Stat label="Applications" value={String(total.started)} /><Stat label="Submitted" value={String(total.submitted)} /><Stat label="Qualified" value={String(total.qualified)} /><Stat label="Funded" value={String(total.funded)} /><Stat label="Commission" value={money(total.commission)} /><Stat label="Return on ad spend" value={roasText(total.roas)} /></div>
      <p style={{ ...muted, marginTop: 0 }}>Commission is funded amount x {Math.round(data.commissionRate * 1000) / 10}%. People are matched to an ad by the Google click they arrived on.{!data.spendAvailable && " Google reports spend for campaigns and keywords only, so spend is blank here."}</p>
      <Table headers={[heading, "Spend", "Clicks", "People", "Applications", "Submitted", "Qualified", "Funded", "Funded $", "Commission", "ROAS", "Cost / submit"]} empty={!data.rows.length && "Nothing in this window yet."}>{data.rows.map((row) => <tr key={row.key}><td style={td}>{row.key}</td><td style={td}>{money(row.spend)}</td><td style={td}>{row.clicks ?? "-"}</td><td style={td}>{row.people}</td><td style={td}>{row.started}</td><td style={td}>{row.submitted}</td><td style={td}>{row.qualified}</td><td style={td}>{row.funded}</td><td style={td}>{money(row.fundedAmount)}</td><td style={td}>{money(row.commission)}</td><td style={td}>{roasText(row.roas)}</td><td style={td}>{money(row.costPerSubmit)}</td></tr>)}</Table></>}
  </section>;
}

type Visitor = { session_id: string; contact_id: string | null; contact_name: string | null; contact_phone: string | null; last_seen_at: string; landing_page: string | null; referrer: string | null; from_ad: boolean; utm_source: string | null; utm_campaign: string | null; campaign_name: string | null; ad_group_name: string | null; keyword: string | null; click_date: string | null; pages: number; dwell_ms: number; application_id: string | null; step: number | null; submitted_at: string | null; pipeline_state: string | null; funded_amount: number | null };
type VisitEvent = { event_type: string; path: string | null; step: string | null; dwell_ms: number | null; meta: Record<string, unknown> | null; occurred_at: string };

export function visitorOutcome(v: Pick<Visitor, "application_id" | "submitted_at" | "step" | "pipeline_state" | "funded_amount">) {
  if (!v.application_id) return "No application";
  if (v.funded_amount) return "Funded " + money(v.funded_amount);
  if (v.submitted_at) return "Submitted" + (v.pipeline_state ? " - " + v.pipeline_state : "");
  return "Stopped at step " + (v.step ?? 1);
}

function VisitTimeline({ sessionId }: { sessionId: string }) {
  const { data, loading, err } = useLoad<{ events: VisitEvent[] }>("/api/marketing/ads-visitors/" + encodeURIComponent(sessionId));
  if (loading) return <p style={muted}>Loading timeline...</p>;
  if (err) return <p role="alert" style={{ color: "#b3261e" }}>{err}</p>;
  const events = data?.events ?? [];
  if (!events.length) return <p style={muted}>No events recorded for this visit.</p>;
  return <ol style={{ margin: 0, paddingLeft: 18 }}>{events.map((event, index) => { const meta = event.meta ?? {}; const bits = [meta.label, meta.section, meta.field, meta.form, meta.depth != null ? meta.depth + "%" : null].filter(Boolean).join(" - "); return <li key={index} style={{ fontSize: 13, color: "var(--ui-text)", marginBottom: 4 }}><span style={muted}>{new Date(event.occurred_at).toLocaleTimeString()}</span>{"  "}{[event.event_type.replace(/_/g, " "), event.step ? "step " + event.step : "", event.path ?? "", bits].filter(Boolean).join("  |  ")}{event.dwell_ms ? " (" + duration(event.dwell_ms) + ")" : ""}</li>; })}</ol>;
}

export function VisitorsPanel() {
  const [days, setDays] = useState(30), [filter, setFilter] = useState("all"), [open, setOpen] = useState<string | null>(null);
  const { data, err, loading } = useLoad<{ visitors: Visitor[] }>("/api/marketing/ads-visitors?days=" + days + "&filter=" + filter);
  const rows = data?.visitors ?? [];
  return <section style={card} data-testid="ads-visitors"><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 16, color: "var(--ui-text)" }}>Every visitor</h3><select aria-label="Show" value={filter} onChange={(event) => setFilter(event.target.value)} style={{ ...select, marginLeft: "auto" }}><option value="all">Everyone</option><option value="ad">From an ad</option><option value="identified">Known people</option><option value="abandoned">Started, not submitted</option><option value="submitted">Submitted</option></select><Days value={days} onChange={setDays} options={[7, 30, 90]} /></div>
    <p style={{ ...muted, marginTop: 0 }}>A visitor becomes a named person when they sign in to the application with their phone; everything they did before that is joined to them.</p>{loading && <p style={muted}>Loading...</p>}{err && <p role="alert" style={{ color: "#b3261e" }}>{err}</p>}
    {!loading && !err && <Table headers={["Last seen", "Person", "Came from", "Ad / keyword", "Landed on", "Pages", "Time", "Outcome", ""]} empty={!rows.length && "No visitors in this window."}>{rows.map((visitor) => <Fragment key={visitor.session_id}><tr><td style={td}>{new Date(visitor.last_seen_at).toLocaleString()}</td><td style={td}>{visitor.contact_id ? <a href={"/crm/contacts/" + visitor.contact_id} style={{ color: "var(--ui-link, #0B1F3A)" }}>{visitor.contact_name || visitor.contact_phone || "Contact"}</a> : "Anonymous"}</td><td style={td}>{visitor.from_ad ? "Google Ads" : visitor.utm_source || (visitor.referrer ? new URL(visitor.referrer, "https://x").hostname : "Direct")}</td><td style={td}>{visitor.campaign_name ? [visitor.campaign_name, visitor.ad_group_name, visitor.keyword].filter(Boolean).join(" / ") : visitor.utm_campaign || "-"}{visitor.click_date ? " (" + visitor.click_date + ")" : ""}</td><td style={td}>{visitor.landing_page ? visitor.landing_page.replace(/^https?:\/\/[^/]+/, "") || "/" : "-"}</td><td style={td}>{visitor.pages}</td><td style={td}>{duration(visitor.dwell_ms)}</td><td style={td}>{visitorOutcome(visitor)}</td><td style={td}><button type="button" className="ui-button ui-button--secondary" onClick={() => setOpen(open === visitor.session_id ? null : visitor.session_id)}>{open === visitor.session_id ? "Hide" : "Timeline"}</button></td></tr>{open === visitor.session_id && <tr><td style={td} colSpan={9}><VisitTimeline sessionId={visitor.session_id} /></td></tr>}</Fragment>)}</Table>}
  </section>;
}

type Dropoff = { totals: { started: number; submitted: number }; steps: Array<{ step: number; stopped: number; from_ad: number }>; reasons: Array<{ reason: string; step: number; count: number; latest: string }>; fields: Array<{ step: string; field: string; count: number }>; timing: Array<{ step: string; avg_ms: number }> };
const STEP_NAMES: Record<string, string> = { "1": "Financial profile", "2": "Product", "3": "Business", "4": "Applicant", "5": "Documents", "6": "Review & submit" };

export function DropoffPanel() {
  const [days, setDays] = useState(90);
  const { data, err, loading } = useLoad<Dropoff>("/api/marketing/ads-dropoff?days=" + days);
  const started = data?.totals.started ?? 0;
  return <section style={card} data-testid="ads-dropoff"><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}><h3 style={{ margin: 0, fontSize: 16, color: "var(--ui-text)" }}>Where applications stop, and why</h3><span style={{ marginLeft: "auto" }}><Days value={days} onChange={setDays} /></span></div>{loading && <p style={muted}>Loading...</p>}{err && <p role="alert" style={{ color: "#b3261e" }}>{err}</p>}
    {!loading && !err && data && <><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}><Stat label="Started" value={String(started)} /><Stat label="Submitted" value={String(data.totals.submitted)} /><Stat label="Completion" value={started ? Math.round(data.totals.submitted / started * 100) + "%" : "-"} /></div><Table headers={["Step", "Stopped here", "Of those, from an ad", "Average time on step"]} empty={!data.steps.length && "No unfinished applications in this window."}>{data.steps.map((step) => { const timing = data.timing.find((item) => String(item.step) === String(step.step)); return <tr key={step.step}><td style={td}>{step.step} - {STEP_NAMES[String(step.step)] ?? ""}</td><td style={td}>{step.stopped}</td><td style={td}>{step.from_ad}</td><td style={td}>{duration(timing?.avg_ms)}</td></tr>; })}</Table><h4 style={{ fontSize: 14, color: "var(--ui-text)", margin: "16px 0 8px" }}>Why (when the app knows)</h4><Table headers={["Reason", "Step", "Count", "Latest"]} empty={!data.reasons.length && "No recorded reasons in this window."}>{data.reasons.map((reason, index) => <tr key={index}><td style={td}>{reason.reason.replace(/_/g, " ")}</td><td style={td}>{reason.step}</td><td style={td}>{reason.count}</td><td style={td}>{new Date(reason.latest).toLocaleDateString()}</td></tr>)}</Table><h4 style={{ fontSize: 14, color: "var(--ui-text)", margin: "16px 0 8px" }}>The field they were on when they left</h4><Table headers={["Step", "Field", "Count"]} empty={!data.fields.length && "Field tracking starts with the latest client app; nothing recorded yet."}>{data.fields.map((field, index) => <tr key={index}><td style={td}>{field.step ? field.step + " - " + (STEP_NAMES[field.step] ?? "") : "Website form"}</td><td style={td}>{field.field || "-"}</td><td style={td}>{field.count}</td></tr>)}</Table></>}
  </section>;
}

export function AudiencesNote() {
  return <section style={card} data-testid="ads-audiences"><h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" }}>Audiences</h3><p style={{ ...muted, margin: 0 }}>Funded and qualified clients who gave ad-measurement consent are the "find more like these" lists. Applicants who started but did not submit are a remarketing list built from the Google tag, so no personal details are uploaded for them. Google only serves ads to a list once it reaches its minimum size.</p></section>;
}
