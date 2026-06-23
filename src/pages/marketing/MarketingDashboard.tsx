// BF_PORTAL_MARKETING_FUNNEL_LIVE_v1 — Analytics tab renders the live
// application funnel from GET /api/marketing/funnel (respondOk envelope).
import { useEffect, useState } from "react";
import { api } from "@/api";

type MarketingTab = "google-ads" | "linkedin-ads" | "analytics";

const MARKETING_TABS: { id: MarketingTab; label: string }[] = [
  { id: "google-ads", label: "Google Ads" },
  { id: "linkedin-ads", label: "LinkedIn Ads" },
  { id: "analytics", label: "Analytics" },
];

type FunnelStep = {
  key: string;
  label: string;
  count: number;
  pctOfStart: number;
  dropFromPrev: number;
};

function AnalyticsFunnel() {
  const [days, setDays] = useState(90);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: { steps?: FunnelStep[] }; steps?: FunnelStep[] }>(
        "/api/marketing/funnel",
        { params: { days } },
      )
      .then((res) => {
        if (cancelled) return;
        const next = res?.data?.steps ?? res?.steps ?? [];
        setSteps(Array.isArray(next) ? next : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load funnel");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const top = steps[0]?.count ?? 0;

  return (
    <section className="drawer-section">
      <div className="flex items-center justify-between mb-3">
        <div className="drawer-section__title">Application funnel</div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value) || 90)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading funnel…</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && steps.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No applications in this period yet.</p>}
      {!loading && !error && steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((s) => {
            const width = top > 0 ? Math.max(2, Math.round((s.count / top) * 100)) : 0;
            return <div key={s.key}><div className="flex items-center justify-between text-sm" style={{ color: "var(--ui-text)" }}><span>{s.label}</span><span style={{ color: "var(--ui-text-muted)" }}>{s.count} · {s.pctOfStart}% of start{s.dropFromPrev > 0 ? ` · −${s.dropFromPrev}% vs prev` : ""}</span></div><div style={{ height: 10, borderRadius: 6, background: "var(--ui-border)", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${width}%`, height: "100%", background: "var(--ui-accent-blue)" }} /></div></div>;
          })}
        </div>
      )}
    </section>
  );
}

const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("analytics");
  return <div className="space-y-4"><div className="flex flex-wrap gap-2">{MARKETING_TABS.map((entry) => <button key={entry.id} type="button" className={`ui-button ${tab === entry.id ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setTab(entry.id)}>{entry.label}</button>)}</div>{tab === "google-ads" && <section className="drawer-section"><div className="drawer-section__title">Google Ads</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Google Ads spend, impressions, and conversions will appear here once the Ads account is linked.</p></section>}{tab === "linkedin-ads" && <section className="drawer-section"><div className="drawer-section__title">LinkedIn Ads</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. LinkedIn campaign data will mirror the Google Ads panel once linked.</p></section>}{tab === "analytics" && <AnalyticsFunnel />}</div>;
};

export default MarketingDashboard;
