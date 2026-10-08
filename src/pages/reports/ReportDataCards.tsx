// BF_PORTAL_REPORTS_SECTION_v714 - cards for the reports BF-Server v714 serves
// from /api/reports/data/:key.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { api } from "@/api";

const th: CSSProperties = { textAlign: "left", padding: "4px 8px", color: "var(--ui-text-muted)", fontWeight: 600, fontSize: 12 };
const td: CSSProperties = { padding: "4px 8px", borderTop: "1px solid var(--ui-border)", color: "var(--ui-text)", fontSize: 13 };
const money = (v: unknown) => "$" + Math.round(Number(v ?? 0)).toLocaleString("en-CA");

function T({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Nothing to show yet.</p>;
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{headers.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody></table></div>;
}

// BF_PORTAL_REPORTS_BATCH5_v760 - cards for BF-Server v776 reports.
const mins = (m: unknown) => { const n = Number(m); if (m === null || m === undefined || !Number.isFinite(n)) return "-"; return n < 60 ? Math.round(n) + " min" : n < 1440 ? (Math.round(n / 6) / 10) + " h" : (Math.round(n / 144) / 10) + " days"; };
const dd = (v: unknown) => (v === null || v === undefined ? "-" : String(v) + " d");
export function CommissionReceivableCard({ d }: { d: any }) {
  const [items, setItems] = useState<any[]>(d.items ?? []);
  const [err, setErr] = useState<string | null>(null);
  const mark = async (i: any, clear = false) => {
    setErr(null);
    let amount: number | null = null;
    if (!clear) { const a = window.prompt("Commission received for " + (i.name ?? "this file") + " (leave blank for " + money(i.expected) + "):", ""); if (a === null) return; amount = a.trim() === "" ? Number(i.expected) : Number(a.replace(/[$,\s]/g, "")); if (!Number.isFinite(amount) || amount < 0) { setErr("That is not an amount."); return; } }
    try {
      await api.post("/api/reports/commission-received", clear ? { applicationId: i.application_id, clear: true } : { applicationId: i.application_id, amount });
      setItems((prev) => prev.map((x) => x.application_id === i.application_id ? { ...x, commission_received_at: clear ? null : new Date().toISOString(), received_amount: clear ? null : amount } : x));
    } catch { setErr("Could not save. Only Admin can record commission."); }
  };
  const open = items.filter((x) => !x.commission_received_at);
  return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}><strong>{open.length}</strong> funded file(s) with commission not yet received{(d.buckets ?? []).filter((b: any) => b.files).map((b: any) => " · " + b.age + ": " + money(b.expected)).join("")}</p>
    {err && <p role="alert" style={{ color: "#991b1b", fontSize: 12, fontWeight: 600 }}>{err}</p>}
    <T headers={["File", "Lender", "Funded", "Days", "Expected", "Received", ""]} rows={items.map((i: any) => [i.name ?? "-", i.lender ?? "-", i.funded_at ? String(i.funded_at).slice(0, 10) : "-", i.days_since_funded, money(i.expected) + (i.currency && i.currency !== "CAD" ? " " + i.currency : ""), i.commission_received_at ? money(i.received_amount ?? i.expected) + " on " + String(i.commission_received_at).slice(0, 10) : "Not yet", i.commission_received_at ? <button key="u" type="button" onClick={() => void mark(i, true)} style={{ fontSize: 12 }}>Undo</button> : <button key="m" type="button" data-testid="commission-mark-received" onClick={() => void mark(i)} style={{ fontSize: 12 }}>Mark received</button>])} /></>;
}

// BF_PORTAL_REPORTS6_10_v765 - Goals: this month's targets with progress bars; Admin sets targets inline.
function Bar({ value, target }: { value: number; target: number | null }) {
  if (!target) return <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No target</span>;
  const pct = Math.min(100, Math.round((value / target) * 100));
  return <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 140 }}><div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--ui-border)" }}><div style={{ width: pct + "%", height: 8, borderRadius: 4, background: pct >= 100 ? "#15803d" : "#1d4ed8" }} /></div><span style={{ fontSize: 12 }}>{pct}%</span></div>;
}
export function GoalsCard({ d }: { d: any }) {
  const [rows, setRows] = useState<any[]>(d.rows ?? []);
  const [err, setErr] = useState<string | null>(null);
  const edit = async (r: any) => {
    setErr(null);
    const f = window.prompt("Funding target for " + r.name + " this month (blank for none):", r.fundingTarget ?? "");
    if (f === null) return;
    const c = window.prompt("Commission target for " + r.name + " this month (blank for none):", r.commissionTarget ?? "");
    if (c === null) return;
    try {
      await api.put("/api/reports/goals", { userId: r.userId, fundingTarget: f.trim(), commissionTarget: c.trim() });
      setRows((prev) => prev.map((x) => x.userId === r.userId ? { ...x, fundingTarget: f.trim() === "" ? null : Number(f), commissionTarget: c.trim() === "" ? null : Number(c) } : x));
    } catch { setErr("Could not save the targets. Use plain numbers."); }
  };
  return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>{d.month}. Funded = requested amount of files funded this month; commission = commission marked received this month.</p>
    {err && <p role="alert" style={{ color: "#991b1b", fontSize: 12, fontWeight: 600 }}>{err}</p>}
    <T headers={["Person", "Funded", "Funding goal", "Commission", "Commission goal", ""]} rows={rows.map((r: any) => [r.name, money(r.funded), <Bar key="f" value={r.funded} target={r.fundingTarget} />, money(r.commission), <Bar key="c" value={r.commission} target={r.commissionTarget} />, d.canEdit ? <button key="e" type="button" onClick={() => void edit(r)} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer" }}>Set goals</button> : ""])} /></>;
}

// BF_PORTAL_REPORTS15_18_v769 - pipeline snapshot (pick a past day), and the custom report builder.
export function PipelineSnapshotCard({ d: initial }: { d: any }) {
  const [d, setD] = useState<any>(initial);
  const [busy, setBusy] = useState(false);
  const pick = async (date: string) => {
    setBusy(true);
    try { setD(await api.get(`/api/reports/data/pipeline_snapshot?date=${encodeURIComponent(date)}`)); } finally { setBusy(false); }
  };
  return <><div style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 8px", fontSize: 13 }}>
      <label htmlFor="snapshot-date">Compare</label>
      <select id="snapshot-date" data-testid="snapshot-date" value={d.date ?? ""} disabled={busy || !(d.dates ?? []).length} onChange={(e) => void pick(e.target.value)}>
        {(d.dates ?? []).map((x: string) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span style={{ color: "var(--ui-text-muted)" }}>with today ({d.today ?? "-"}). {d.note}</span>
    </div>
    <T headers={["Stage", `Files ${d.date ?? ""}`, `Amount ${d.date ?? ""}`, "Files today", "Amount today"]} rows={(d.rows ?? []).map((r: any) => [r.stage, r.then_files, money(r.then_amount), r.now_files, money(r.now_amount)])} /></>;
}

const CUSTOM_KEY = "bf_custom_report_v769";
const LABELS: Record<string, string> = { applications: "Applications", contacts: "Contacts", tasks: "Tasks", stage: "Stage", product: "Product", source: "Lead source", owner: "Owner", month: "Month", lifecycle: "Lifecycle stage", status: "Status", assignee: "Assignee", type: "Type", count: "Count", amount: "Total amount", funded: "Funded", average_amount: "Average amount", opted_out: "Opted out of texts", overdue: "Overdue", completed: "Completed" };
const label = (k: string) => LABELS[k] ?? k;
export function CustomReportCard({ d: initial }: { d: any }) {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "null"); } catch { return null; } })();
  const [cfg, setCfg] = useState<{ entity: string; groupBy: string; measure: string; days: number }>(saved ?? { entity: initial.entity ?? "applications", groupBy: initial.groupBy ?? "stage", measure: initial.measure ?? "count", days: 90 });
  const [d, setD] = useState<any>(initial);
  const menu: Record<string, { groups: string[]; measures: string[] }> = d.menu ?? initial.menu ?? {};
  useEffect(() => {
    let off = false;
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(cfg)); } catch { /* private mode */ }
    api.get(`/api/reports/data/custom_report?entity=${cfg.entity}&groupBy=${cfg.groupBy}&measure=${cfg.measure}&days=${cfg.days}`).then((r) => { if (!off) setD(r); }).catch(() => undefined);
    return () => { off = true; };
  }, [cfg.entity, cfg.groupBy, cfg.measure, cfg.days]);
  const setEntity = (entity: string) => { const m = menu[entity]; setCfg({ ...cfg, entity, groupBy: m?.groups[0] ?? "month", measure: m?.measures[0] ?? "count" }); };
  const rows: Array<{ label: string; value: number }> = d.rows ?? [];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const isMoney = /amount/.test(cfg.measure);
  const sel: CSSProperties = { padding: "4px 6px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
  return <>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "0 0 10px", fontSize: 13 }}>
      <select aria-label="Record type" data-testid="custom-entity" style={sel} value={cfg.entity} onChange={(e) => setEntity(e.target.value)}>{Object.keys(menu).map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
      <span>grouped by</span>
      <select aria-label="Group by" data-testid="custom-group" style={sel} value={cfg.groupBy} onChange={(e) => setCfg({ ...cfg, groupBy: e.target.value })}>{(menu[cfg.entity]?.groups ?? []).map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
      <span>showing</span>
      <select aria-label="Measure" data-testid="custom-measure" style={sel} value={cfg.measure} onChange={(e) => setCfg({ ...cfg, measure: e.target.value })}>{(menu[cfg.entity]?.measures ?? []).map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
      <span>for the last</span>
      <select aria-label="Period" style={sel} value={cfg.days} onChange={(e) => setCfg({ ...cfg, days: Number(e.target.value) })}>{[30, 90, 180, 365, 730].map((n) => <option key={n} value={n}>{n} days</option>)}</select>
    </div>
    {!rows.length ? <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Nothing to show yet.</p> :
      <div data-testid="custom-rows">{rows.map((r) => <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 30%) 1fr auto", gap: 8, alignItems: "center", fontSize: 13, padding: "3px 0" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
        <div style={{ height: 10, borderRadius: 5, background: "var(--ui-border)" }}><div style={{ width: Math.round((r.value / max) * 100) + "%", height: 10, borderRadius: 5, background: "#1d4ed8" }} /></div>
        <span>{isMoney ? money(r.value) : r.value.toLocaleString("en-CA")}</span>
      </div>)}</div>}
  </>;
}

export function renderReport(report: string, d: any): ReactNode {
  // BF_PORTAL_REPORTS15_18_v769 - cards for BF-Server v786 reports.
  if (report === "pipeline_snapshot") return <PipelineSnapshotCard d={d} />;
  if (report === "issues_report") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Last {d.days} days. {d.note}</p><T headers={["Month", "Opened", "Resolved", "Median days to resolve"]} rows={(d.byMonth ?? []).map((r: any) => [r.label, r.opened, r.resolved, r.median_days === null ? "-" : r.median_days + " d"])} /><div style={{ height: 10 }} /><T headers={["Open now", "Open", "In progress", "Oldest (days)"]} rows={(d.open ?? []).map((r: any) => [r.label, r.open, r.in_progress, r.oldest_days])} /></>;
  if (report === "custom_report") return <CustomReportCard d={d} />;
  // BF_PORTAL_REPORTS11_14_v768 - cards for BF-Server v785 reports.
  if (report === "email_performance") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Last {d.days} days. {d.note}</p><T headers={["Staff member", "Sent", "Opened"]} rows={(d.staff ?? []).map((r: any) => [r.label, r.sent, r.opened])} /><div style={{ height: 10 }} /><T headers={["Sequence", "Sent", "Opened", "Clicked"]} rows={(d.sequences ?? []).map((r: any) => [r.label, r.sent, r.opened, r.clicked])} /><div style={{ height: 10 }} /><T headers={["Template", "Sent", "Opened", "Clicked"]} rows={(d.templates ?? []).map((r: any) => [r.label, r.sent, r.opened, r.clicked])} /></>;
  if (report === "sms_campaign_performance") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Last {d.days} days. {d.note}</p><T headers={["Campaign", "Sent", "Delivered", "Failed", "Clicked", "Replied", "Opted out"]} rows={(d.campaigns ?? []).map((r: any) => [r.label, r.sent, r.delivered, r.failed, r.clicked, r.replied, r.opted_out])} /><div style={{ height: 10 }} /><T headers={["Sequence", "Sent", "Delivered", "Failed", "Clicked"]} rows={(d.sequences ?? []).map((r: any) => [r.label, r.sent, r.delivered, r.failed, r.clicked])} /></>;
  if (report === "website_pages") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Visits in the last {d.days} days. {d.note}</p><T headers={["Landing page", "Visits", "Applications"]} rows={(d.pages ?? []).map((r: any) => [r.label, r.visits, r.applications])} /><div style={{ height: 10 }} /><T headers={["Device", "Visits", "Applications"]} rows={(d.devices ?? []).map((r: any) => [r.label, r.visits, r.applications])} /></>;
  if (report === "lifecycle") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Contacts created in the last {d.days} days.</p><T headers={["Stage", "Contacts", "Median days to next stage"]} rows={(d.stages ?? []).map((r: any) => [r.label, r.count, r.median_days_to_next === null ? "-" : r.median_days_to_next + " d"])} /></>;
  // BF_PORTAL_REPORTS6_10_v765 - cards for BF-Server v780 reports.
  if (report === "pipeline_movement") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Last {d.days} days.</p><T headers={["", "Files", "Amount"]} rows={(d.rows ?? []).map((r: any) => [r.label, r.files, money(r.amount)])} /></>;
  if (report === "average_deal_size") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Requested amounts, files started in the last {d.days} days.</p><T headers={["Product", "Files", "Average", "Median", "Funded average"]} rows={(d.byProduct ?? []).map((r: any) => [r.label, r.files, money(r.average), money(r.median), r.funded_average === null ? "-" : money(r.funded_average)])} /><div style={{ height: 10 }} /><T headers={["Lead source", "Files", "Average", "Median", "Funded average"]} rows={(d.bySource ?? []).map((r: any) => [r.label, r.files, money(r.average), money(r.median), r.funded_average === null ? "-" : money(r.funded_average)])} /></>;
  if (report === "goals") return <GoalsCard d={d} />;
  if (report === "meetings") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Client bookings made in the last {d.days} days. {d.note}</p><T headers={["Person", "Booked", "Held", "Cancelled", "Upcoming", "Led to funded"]} rows={(d.rows ?? []).map((r: any) => [r.label, r.booked, r.held, r.cancelled, r.upcoming, r.led_to_funded])} /></>;
  if (report === "tasks_report") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Completed counts cover the last {d.days} days.</p><T headers={["Person", "Open", "Overdue", "Completed", "On time"]} rows={(d.rows ?? []).map((r: any) => [r.label, r.open, r.overdue, r.completed, r.on_time])} /></>;
  if (report === "deal_velocity") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Median days for files funded in the last {d.days} days.</p><T headers={["Product", "Funded", "Start to submitted", "Submitted to offer", "Offer to funded", "Start to funded"]} rows={(d.rows ?? []).map((r: any) => [r.product, r.funded, dd(r.to_submit), dd(r.to_offer), dd(r.offer_to_funded), dd(r.total)])} /></>;
  if (report === "win_rate") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Files submitted in the last {d.days} days. Win rate = funded out of funded + lost.</p><T headers={["Month", "Submitted", "Funded", "Lost", "Open", "Win rate"]} rows={(d.months ?? []).map((r: any) => [r.label, r.submitted, r.funded, r.lost, r.open, r.win_rate === null ? "-" : r.win_rate + "%"])} /><div style={{ height: 8 }} /><T headers={["Product", "Submitted", "Funded", "Lost", "Open", "Win rate"]} rows={(d.products ?? []).map((r: any) => [r.label, r.submitted, r.funded, r.lost, r.open, r.win_rate === null ? "-" : r.win_rate + "%"])} /></>;
  if (report === "call_outcomes") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Outbound calls, last {d.days} days{d.own ? " - your own calls" : ""}.</p><T headers={["Person", "Result", "Calls"]} rows={(d.rows ?? []).map((r: any) => [r.staff, r.outcome, r.calls])} /></>;
  if (report === "client_reply_time") return <><T headers={["Channel", "Client messages", "Answered", "Median reply"]} rows={(d.channels ?? []).map((c: any) => [c.channel, c.messages, c.answered, mins(c.median_minutes)])} /><p style={{ margin: "10px 0 6px", fontSize: 13, color: "var(--ui-text)" }}><strong>Waiting for a reply now:</strong> {(d.waiting ?? []).length}</p><T headers={["Client", "Channel", "Waiting"]} rows={(d.waiting ?? []).map((w: any) => [w.name, w.channel, mins(w.minutes_waiting)])} /></>;
  if (report === "commission_receivable") return <CommissionReceivableCard d={d} />;
  if (report === "stuck_deals") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.stuck} file(s) have sat {d.threshold}+ days in their stage.</p><T headers={["File", "Stage", "Days in stage", "Amount"]} rows={(d.items ?? []).map((i: any) => [<a key="a" href={"/applications/" + i.application_id} style={{ color: "var(--ui-text)" }}>{i.name}</a>, i.stage ?? "-", <strong key="d" style={{ color: i.days_in_stage >= d.threshold ? "#b91c1c" : "var(--ui-text)" }}>{i.days_in_stage}</strong>, i.requested_amount ? money(i.requested_amount) : "-"])} /></>;
  if (report === "lender_scorecard") return <T headers={["Lender", "Sent", "Offers", "Funded", "Days to offer"]} rows={(d.lenders ?? []).map((l: any) => [l.lender, l.sent, l.offers, l.funded, l.days_to_offer ?? "-"])} />;
  if (report === "speed_to_lead") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.submitted} submitted in the last {d.days} days; {d.not_called} not called yet.</p><T headers={["Staff", "Calls", "Median minutes to first call"]} rows={(d.staff ?? []).map((s: any) => [s.staff, s.calls, s.median_minutes ?? "-"])} /></>;
  // BF_PORTAL_ONE_COMMISSION_v727 - same commission rule as the Dashboard (no flat 3%).
  if (report === "commission_by_month") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Same rule as the Dashboard: 2% unless the lender product sets its own, in Canadian dollars.</p><T headers={["Month", "Funded", "Amount", "Commission"]} rows={(d.months ?? []).map((m: any) => [m.month, m.funded, money(m.funded_amount), money(m.commission)])} /></>;
  // BF_PORTAL_REPORTS_BATCH4_v722
  if (report === "decline_reasons") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>From the reasons recorded when a lender passes or a file is rejected, last {d.days} days.</p><T headers={["Reason", "Times", "Files", "Whole file", "Lenders"]} rows={(d.reasons ?? []).map((r: any) => [r.reason, r.times, r.files, r.whole_file, r.lenders || "-"])} /></>;
  if (report === "document_turnaround") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>From when a document was required to the first upload, last {d.days} days.</p><T headers={["Document", "Asked for", "Received", "Still outstanding", "Rejected", "Typical wait"]} rows={(d.categories ?? []).map((c: any) => [c.category, c.requested, c.received, c.outstanding, c.rejected, c.median_hours == null ? "-" : c.median_hours < 48 ? `${c.median_hours} h` : `${Math.round(c.median_hours / 24)} days`])} /></>;
  // BF_PORTAL_REPORTS_BATCH3_v721
  if (report === "best_lender_by_deal_type") return <T headers={["Deal type", "Top lender", "Funded", "Amount", "Also funding"]} rows={(d.types ?? []).map((t: any) => [t.deal_type, t.top?.lender ?? "-", t.top?.funded ?? 0, money(t.top?.amount), (t.lenders ?? []).slice(1).map((l: any) => `${l.lender} (${l.funded})`).join(", ") || "-"])} />;
  if (report === "consent_health") return <><T headers={["", "Contacts"]} rows={[["All Financial contacts", d.contacts ?? 0], ["Can be texted: express consent", d.express_sms ?? 0], ["Can be texted: past clients (2 years)", d.implied_client ?? 0], ["Can be texted: applicants (6 months)", d.implied_inquiry ?? 0], ["Opted out of marketing", d.opted_out_marketing ?? 0], ["Opted out of texts", d.opted_out_sms ?? 0]]} /><p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ui-text)" }}><strong>{d.expiring_30_days ?? 0}</strong> contact(s) lose texting consent in the next 30 days - ask them for express consent before then.</p></>;
  // BF_PORTAL_REPORTS_BATCH2_v719 - cards for BF-Server v719 reports.
  if (report === "revenue_forecast") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>Commission if every open file funds: <strong>{money(d.full_total)}</strong> (matches the Dashboard). Expected, weighted by each stage's chance: <strong>{money(d.total)}</strong></p><T headers={["Stage", "Files", "Amount (CAD)", "Commission if it funds", "Chance it funds", "Expected"]} rows={(d.stages ?? []).map((s: any) => [s.stage, s.files, money(s.amount), money(s.full_commission), Math.round(Number(s.odds) * 100) + "%", money(s.expected_commission)])} /><p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ui-text-muted)" }}>Same commission rule as the Dashboard; files on Hold are left out.</p></>;
  if (report === "media_fee_agreements") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.signed} signed, {d.waiting} waiting.</p><T headers={["File", "Lender", "Status", "Signer", "Fee"]} rows={(d.items ?? []).map((m: any) => [m.name ?? "-", m.lender ?? "-", m.status === "signed" && m.signed_manually ? "signed (by staff)" : m.status, m.signer_name ?? "-", money(m.fee ?? m.fee_2pct) + (m.fee_terms && m.fee_terms !== "2%" ? " (" + m.fee_terms + ")" : "")])} /* BF_PORTAL_FEE_MANUAL_SIGN_v759 */ /></>;
  if (report === "payouts_owed") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.unpaid} funded broker file(s) not yet paid.</p><T headers={["File", "Broker", "Broker share", "Funded", "Payout"]} rows={(d.items ?? []).map((p: any) => [p.name ?? "-", p.broker_name ?? "-", p.broker_pct != null ? p.broker_pct + "%" : "-", money(p.funded_amount), p.payout_paid_on ? `${money(p.payout_amount)} paid ${String(p.payout_paid_on).slice(0, 10)}` : "Not paid"])} /></>;
  if (report === "staff_activity") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Last {d.days} days{d.own ? " - your own calls" : ""}.</p><T headers={["Person", "Outbound", "Inbound", "Connected", "Talk minutes"]} rows={(d.staff ?? []).map((s: any) => [s.staff, s.outbound, s.inbound, s.connected, s.talk_minutes])} /></>;
  if (report === "missed_calls") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.missed} missed in the last {d.days} days; <strong>{d.not_called_back}</strong> not called back.</p><T headers={["When", "Caller", "Called back"]} rows={(d.items ?? []).map((c: any) => [new Date(c.created_at).toLocaleString("en-CA"), c.caller ?? "-", c.minutes_to_callback == null ? "Not yet" : `after ${c.minutes_to_callback} min`])} /></>;
  if (report === "monthly_cohorts") return <T headers={["Month", "Started", "Submitted", "Funded"]} rows={(d.months ?? []).map((m: any) => [m.month, m.started, `${m.submitted} (${m.started ? Math.round((m.submitted / m.started) * 100) : 0}%)`, `${m.funded} (${m.started ? Math.round((m.funded / m.started) * 100) : 0}%)`])} />;
  if (report === "renewal_opportunities") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Clients funded 9 to 15 months ago.</p><T headers={["Client", "Product", "Funded", "Funded on"]} rows={(d.items ?? []).map((r: any) => [<a key="a" href={"/applications/" + r.application_id} style={{ color: "var(--ui-text)" }}>{r.name ?? "Client"}</a>, r.product_category ?? "-", money(r.funded_amount), r.funded_at ? new Date(r.funded_at).toLocaleDateString("en-CA") : "-"])} /></>;
  if (report === "insurance_cross_sell") return <p style={{ margin: 0, fontSize: 13, color: "var(--ui-text)" }}>Of <strong>{d.funded}</strong> Financial deals funded in the last {d.days} days, <strong>{d.with_insurance}</strong> also have a Boreal Insurance application{d.funded ? ` (${Math.round((d.with_insurance / d.funded) * 100)}%)` : ""}.</p>;
  return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>This report is not available.</p>;
}

export function ReportDataCard({ report, days }: { report: string; days?: number }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let off = false;
    setD(null); setErr(false);
    api.get(`/api/reports/data/${encodeURIComponent(report)}${days ? `?days=${days}` : ""}`).then((r) => { if (!off) setD(r); }).catch(() => { if (!off) setErr(true); });
    return () => { off = true; };
  }, [report, days]);
  if (err) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Could not load this report.</p>;
  if (!d) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Loading...</p>;
  return <>{renderReport(report, d)}</>;
}
