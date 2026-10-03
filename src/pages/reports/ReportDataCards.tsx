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
