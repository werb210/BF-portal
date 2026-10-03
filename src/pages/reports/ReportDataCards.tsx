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

export function renderReport(report: string, d: any): ReactNode {
  if (report === "stuck_deals") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.stuck} file(s) have sat {d.threshold}+ days in their stage.</p><T headers={["File", "Stage", "Days in stage", "Amount"]} rows={(d.items ?? []).map((i: any) => [<a key="a" href={"/applications/" + i.application_id} style={{ color: "var(--ui-text)" }}>{i.name}</a>, i.stage ?? "-", <strong key="d" style={{ color: i.days_in_stage >= d.threshold ? "#b91c1c" : "var(--ui-text)" }}>{i.days_in_stage}</strong>, i.requested_amount ? money(i.requested_amount) : "-"])} /></>;
  if (report === "lender_scorecard") return <T headers={["Lender", "Sent", "Offers", "Funded", "Days to offer"]} rows={(d.lenders ?? []).map((l: any) => [l.lender, l.sent, l.offers, l.funded, l.days_to_offer ?? "-"])} />;
  if (report === "speed_to_lead") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.submitted} submitted in the last {d.days} days; {d.not_called} not called yet.</p><T headers={["Staff", "Calls", "Median minutes to first call"]} rows={(d.staff ?? []).map((s: any) => [s.staff, s.calls, s.median_minutes ?? "-"])} /></>;
  if (report === "commission_by_month") return <><p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text-muted)" }}>Estimated at {(Number(d.rate ?? 0) * 100).toFixed(1)}% of the funded amount.</p><T headers={["Month", "Funded", "Amount", "Commission"]} rows={(d.months ?? []).map((m: any) => [m.month, m.funded, money(m.funded_amount), money(m.commission)])} /></>;
  // BF_PORTAL_REPORTS_BATCH2_v719 - cards for BF-Server v719 reports.
  if (report === "revenue_forecast") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>Expected commission from open files: <strong>{money(d.total)}</strong></p><T headers={["Stage", "Files", "Amount", "Chance it funds", "Expected commission"]} rows={(d.stages ?? []).map((s: any) => [s.stage, s.files, money(s.amount), Math.round(Number(s.odds) * 100) + "%", money(s.expected_commission)])} /><p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ui-text-muted)" }}>An estimate: stage odds times the requested amount times the commission rate.</p></>;
  if (report === "media_fee_agreements") return <><p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text)" }}>{d.signed} signed, {d.waiting} waiting.</p><T headers={["File", "Lender", "Status", "Signer", "2% fee"]} rows={(d.items ?? []).map((m: any) => [m.name ?? "-", m.lender ?? "-", m.status, m.signer_name ?? "-", money(m.fee_2pct)])} /></>;
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
