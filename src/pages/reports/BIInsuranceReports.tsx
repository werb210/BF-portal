// BF_PORTAL_REPORTS15_18_v769 - Insurance reports, read from BI-Server (/api/v1/bi/reports/insurance, BI-Server v717).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { api } from "@/api";

const th: CSSProperties = { textAlign: "left", padding: "4px 8px", color: "var(--ui-text-muted)", fontWeight: 600, fontSize: 12 };
const td: CSSProperties = { padding: "4px 8px", borderTop: "1px solid var(--ui-border)", color: "var(--ui-text)", fontSize: 13 };
const money = (v: unknown) => "$" + Math.round(Number(v ?? 0)).toLocaleString("en-CA");
function T({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Nothing to show yet.</p>;
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{headers.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody></table></div>;
}
const h4: CSSProperties = { margin: "12px 0 6px", fontSize: 13, color: "var(--ui-text)" };

export default function BIInsuranceReports() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let off = false;
    api<any>("/api/v1/bi/reports/insurance?days=365").then((r) => { if (!off) setD(r?.data ?? r); }).catch(() => { if (!off) setErr(true); });
    return () => { off = true; };
  }, []);
  if (err) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Could not load the Insurance reports.</p>;
  if (!d) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Loading...</p>;
  return <div data-testid="bi-insurance-reports">
    <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--ui-text-muted)" }}>Last {d.days} days. {d.note}</p>
    <h4 style={h4}>Referrals by referrer</h4>
    <T headers={["Referrer", "Applications", "Policies", "Premium", "Commission"]} rows={(d.referrers ?? []).map((r: any) => [r.label, r.applications, r.policies, money(r.premium), money(r.commission)])} />
    <h4 style={h4}>Carrier turnaround</h4>
    <T headers={["Month submitted", "Submitted", "Decided", "Median days"]} rows={(d.turnaround ?? []).map((r: any) => [r.label, r.submitted, r.decided, r.median_days === null ? "-" : r.median_days + " d"])} />
    <h4 style={h4}>Premium by month</h4>
    <T headers={["Month", "Currency", "Policies", "Premium", "Commission"]} rows={(d.premium ?? []).map((r: any) => [r.label, r.currency, r.policies, money(r.premium), money(r.commission)])} />
  </div>;
}
