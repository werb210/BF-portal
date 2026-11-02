// BF_PORTAL_v878_NAV_REVENUE - one place for the money: the forecast (with the editable odds), commission and fees,
// the Active Contracts portfolio, and goals and renewals. Each tab shows the same report cards Reports shows, so the
// numbers always match; Reports keeps them too.
import { useState, type ReactNode } from "react";
import { ReportDataCard } from "@/pages/reports/ReportDataCards";
import PortfolioReport from "@/features/activeContracts/PortfolioReport";

type TabKey = "forecast" | "commission" | "contracts" | "goals";
export const REVENUE_TABS: Array<{ key: TabKey; label: string; cards: Array<{ title: string; report?: string; node?: () => ReactNode }> }> = [
  { key: "forecast", label: "Forecast", cards: [
    { title: "Forecast by person and team", report: "forecast" },
    { title: "Revenue forecast by stage", report: "revenue_forecast" },
  ] },
  { key: "commission", label: "Commission & fees", cards: [
    { title: "Commission not yet received", report: "commission_receivable" },
    { title: "Commission by month", report: "commission_by_month" },
    { title: "Broker fees paid by link", report: "fee_payments" },
    { title: "Fee agreements", report: "media_fee_agreements" },
    { title: "Payouts owed to brokers", report: "payouts_owed" },
  ] },
  { key: "contracts", label: "Contract portfolio", cards: [
    { title: "Active contracts portfolio", node: () => <PortfolioReport /> },
    { title: "Renewal opportunities", report: "renewal_opportunities" },
  ] },
  { key: "goals", label: "Goals", cards: [
    { title: "This month's goals", report: "goals" },
    { title: "Average deal size", report: "average_deal_size" },
  ] },
];

const card = { background: "var(--ui-surface)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: 16, marginBottom: 16 } as const;

export default function RevenuePage() {
  const [tab, setTab] = useState<TabKey>(() => {
    try { const v = localStorage.getItem("bf.revenue.tab"); if (REVENUE_TABS.some((t) => t.key === v)) return v as TabKey; } catch { /* no storage */ }
    return "forecast";
  });
  const choose = (k: TabKey) => { setTab(k); try { localStorage.setItem("bf.revenue.tab", k); } catch { /* no storage */ } };
  const current = REVENUE_TABS.find((t) => t.key === tab) ?? REVENUE_TABS[0]!;
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, margin: "0 0 12px", color: "var(--ui-text)" }}>Revenue</h1>
      <div role="tablist" aria-label="Revenue" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {REVENUE_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} onClick={() => choose(t.key)}
            style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "1px solid var(--ui-border)",
              color: t.key === tab ? "var(--ui-text)" : "var(--ui-text-muted)",
              background: t.key === tab ? "var(--ui-surface-2, rgba(127,127,127,0.15))" : "transparent" }}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" aria-label={current.label}>
        {current.cards.map((c) => (
          <section key={c.title} style={card}>
            <h2 style={{ fontSize: 15, margin: "0 0 10px", color: "var(--ui-text)" }}>{c.title}</h2>
            {c.node ? c.node() : <ReportDataCard report={c.report!} />}
          </section>
        ))}
      </div>
    </div>
  );
}
