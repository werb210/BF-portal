// BF_PORTAL_v864_ACTIVE_CONTRACTS - Reports card "Active contracts portfolio" (Admin): portfolio totals, renewals due,
// conversion, repeat volume, revenue by lender / product / type, expected vs received, variances, lifetime value.
import { useEffect, useState } from "react";
import { acApi, errorText } from "./api";
import { ErrorLine, h3, money, muted, Row, table, td, th } from "./ui";

type Named = Array<{ name: string; revenue: number }>;

function Ranked({ title, rows }: { title: string; rows: Named }) {
  return (
    <div style={{ minWidth: 0 }}>
      <h3 style={h3}>{title}</h3>
      {rows.length === 0 ? <div style={muted}>No revenue recorded yet.</div> : (
        <table style={table}><thead><tr><th style={th}>Name</th><th style={th}>Revenue</th></tr></thead>
          <tbody>{rows.slice(0, 10).map((r) => <tr key={r.name}><td style={td}>{r.name}</td><td style={td}>{money(r.revenue)}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

export default function PortfolioReport() {
  const [r, setR] = useState<Record<string, any> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { acApi.report().then((x) => setR(x.report)).catch((e) => setErr(errorText(e))); }, []);
  if (err) return <ErrorLine text={err} />;
  if (!r) return <div style={muted}>Loading...</div>;
  return (
    <div data-testid="ac-portfolio-report" style={{ display: "grid", gap: 12, color: "var(--ui-text)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div>
          <Row k="Active contracts" v={r.active_contracts} />
          <Row k="Total original funded" v={money(r.total_original_funded)} />
          <Row k="Estimated outstanding" v={money(r.estimated_outstanding)} />
          <Row k="Renewals due 30 / 60 / 90 days" v={`${r.renewals_due?.d30 ?? 0} / ${r.renewals_due?.d60 ?? 0} / ${r.renewals_due?.d90 ?? 0}`} />
          <Row k="Renewal conversion rate" v={r.renewal_conversion_rate === null ? "n/a" : `${r.renewal_conversion_rate}%`} />
        </div>
        <div>
          <Row k="Repeat-client funding volume" v={money(r.repeat_client_volume)} />
          <Row k="Average contracts per customer" v={r.average_contracts_per_customer} />
          <Row k="Refinance / renewal funded volume" v={money(r.renewal_refinance_volume)} />
          <Row k="Contracts in history" v={r.history_contracts} />
        </div>
        <div>
          <Row k="Upfront commissions" v={money(r.upfront_commissions)} />
          <Row k="Recurring commissions" v={money(r.recurring_commissions)} />
          <Row k="Profit-share revenue" v={money(r.profit_share_revenue)} />
          <Row k="Expected vs received (due to date)" v={`${money(r.expected_vs_received?.expected)} / ${money(r.expected_vs_received?.received)}`} />
          <Row k="Commission variances" v={`${r.commission_variances?.count ?? 0} (${money(r.commission_variances?.amount)})`} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <Ranked title="Revenue by lender" rows={r.revenue_by_lender ?? []} />
        <Ranked title="Revenue by product" rows={r.revenue_by_product ?? []} />
        <Ranked title="Lifetime value by client" rows={r.lifetime_value_by_client ?? []} />
      </div>
      <div style={muted}>Revenue counts received money only (net of broker and referral splits). Lifetime value by lender and product equals the revenue tables above.</div>
    </div>
  );
}
