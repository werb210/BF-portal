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

// BF_PORTAL_MARKETING_GA4_DISPLAY_v1 — Analytics tab also renders live Google
// Analytics (GA4) traffic from GET /api/marketing/ga4 (respondOk envelope).
type Ga4Row = { dim: string; sessions: number; users: number };
type Ga4Report = {
  configured: boolean;
  days?: number;
  summary?: { activeUsers: number; newUsers: number; sessions: number; pageViews: number; avgSessionSec: number };
  channels?: Ga4Row[];
  sources?: Ga4Row[];
  landingPages?: Ga4Row[];
  countries?: Ga4Row[];
  devices?: Ga4Row[];
};

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 130px", minWidth: 120, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ui-text)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function BarList({ title, rows }: { title: string; rows: Ga4Row[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.sessions), 0);
  return (
    <section className="drawer-section" style={{ flex: "1 1 320px", minWidth: 280 }}>
      <div className="drawer-section__title">{title}</div>
      {rows.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No data in this period.</p>}
      <div className="space-y-2">
        {rows.map((r, i) => {
          const width = max > 0 ? Math.max(2, Math.round((r.sessions / max) * 100)) : 0;
          return (
            <div key={`${r.dim}-${i}`}>
              <div className="flex items-center justify-between text-sm" style={{ color: "var(--ui-text)" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62%" }} title={r.dim}>{r.dim || "(not set)"}</span>
                <span style={{ color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{r.sessions.toLocaleString()} · {r.users.toLocaleString()} users</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: "var(--ui-border)", overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: `${width}%`, height: "100%", background: "var(--ui-accent-blue)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Ga4Panel() {
  const [days, setDays] = useState(90);
  const [report, setReport] = useState<Ga4Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ data?: Ga4Report } & Partial<Ga4Report>>("/api/marketing/ga4", { params: { days } })
      .then((res) => {
        if (cancelled) return;
        const r = ((res as any)?.data ?? res) as Ga4Report;
        setReport(r ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const sm = report?.summary;

  return (
    <div className="space-y-4">
      <section className="drawer-section">
        <div className="flex items-center justify-between mb-3">
          <div className="drawer-section__title">Website traffic · Google Analytics</div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value) || 90)} className="border rounded px-2 py-1 text-sm" style={{ color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
        {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading analytics…</p>}
        {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
        {!loading && !error && report && !report.configured && (
          <p style={{ color: "var(--ui-text-muted)" }}>Google Analytics isn’t connected on the server yet. Once the GA4 service account is set, live users, sessions, traffic sources, landing pages, geography, and device data will appear here.</p>
        )}
        {!loading && !error && report?.configured && (
          <div className="flex flex-wrap gap-2">
            <StatCard label="Active users" value={(sm?.activeUsers ?? 0).toLocaleString()} />
            <StatCard label="New users" value={(sm?.newUsers ?? 0).toLocaleString()} />
            <StatCard label="Sessions" value={(sm?.sessions ?? 0).toLocaleString()} />
            <StatCard label="Page views" value={(sm?.pageViews ?? 0).toLocaleString()} />
            <StatCard label="Avg. session" value={fmtDuration(sm?.avgSessionSec ?? 0)} />
          </div>
        )}
      </section>
      {!loading && !error && report?.configured && (
        <>
          <div className="flex flex-wrap gap-3">
            <BarList title="Acquisition channels" rows={report.channels ?? []} />
            <BarList title="Top sources / mediums" rows={report.sources ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Top landing pages" rows={report.landingPages ?? []} />
            <BarList title="Countries" rows={report.countries ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Devices" rows={report.devices ?? []} />
          </div>
        </>
      )}
    </div>
  );
}


const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("analytics");
  return <div className="space-y-4"><div className="flex flex-wrap gap-2">{MARKETING_TABS.map((entry) => <button key={entry.id} type="button" className={`ui-button ${tab === entry.id ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setTab(entry.id)}>{entry.label}</button>)}</div>{tab === "google-ads" && <section className="drawer-section"><div className="drawer-section__title">Google Ads</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Google Ads spend, impressions, and conversions will appear here once the Ads account is linked.</p></section>}{tab === "linkedin-ads" && <section className="drawer-section"><div className="drawer-section__title">LinkedIn Ads</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. LinkedIn campaign data will mirror the Google Ads panel once linked.</p></section>}{tab === "analytics" && (<div className="space-y-4"><AnalyticsFunnel /><Ga4Panel /></div>)}</div>;
};

export default MarketingDashboard;
