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
type Ga4Trend = { date: string; sessions: number };
type Ga4Report = {
  configured: boolean;
  days?: number;
  cached?: boolean;
  error?: string;
  summary?: { activeUsers: number; newUsers: number; sessions: number; pageViews: number; avgSessionSec: number; engagementRate?: number; engagedSessions?: number };
  channels?: Ga4Row[];
  sources?: Ga4Row[];
  campaigns?: Ga4Row[];
  adContent?: Ga4Row[];
  events?: Ga4Row[];
  landingPages?: Ga4Row[];
  topPages?: Ga4Row[];
  newVsReturning?: Ga4Row[];
  countries?: Ga4Row[];
  cities?: Ga4Row[];
  browsers?: Ga4Row[];
  operatingSystems?: Ga4Row[];
  devices?: Ga4Row[];
  trend?: Ga4Trend[];
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

function BarList({ title, rows, unit = "sessions" }: { title: string; rows: Ga4Row[]; unit?: string }) {
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
                <span style={{ color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{r.sessions.toLocaleString()} {unit} · {r.users.toLocaleString()} users</span>
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

function Sparkline({ data }: { data: Ga4Trend[] }) {
  if (!data || data.length === 0) return null;
  const w = 600, h = 56, pad = 4;
  const max = data.reduce((m, d) => Math.max(m, d.sessions), 0) || 1;
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => `${pad + i * stepX},${h - pad - (d.sessions / max) * (h - pad * 2)}`).join(" ");
  return (
    <section className="drawer-section">
      <div className="drawer-section__title">Sessions over time</div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 64 }}>
        <polyline points={pts} fill="none" stroke="var(--ui-accent-blue)" strokeWidth={2} />
      </svg>
      <div className="flex items-center justify-between" style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>
        <span>{data[0]?.date}</span>
        <span>peak {max.toLocaleString()} / day</span>
        <span>{data[data.length - 1]?.date}</span>
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
        {!loading && !error && report?.configured && report.error && (
          <p role="alert" style={{ color: "#dc2626" }}>Google Analytics error: {report.error}</p>
        )}
        {!loading && !error && report?.configured && (
          <div className="flex flex-wrap gap-2">
            <StatCard label="Active users" value={(sm?.activeUsers ?? 0).toLocaleString()} />
            <StatCard label="New users" value={(sm?.newUsers ?? 0).toLocaleString()} />
            <StatCard label="Sessions" value={(sm?.sessions ?? 0).toLocaleString()} />
            <StatCard label="Page views" value={(sm?.pageViews ?? 0).toLocaleString()} />
            <StatCard label="Avg. session" value={fmtDuration(sm?.avgSessionSec ?? 0)} />
            <StatCard label="Engaged sessions" value={(sm?.engagedSessions ?? 0).toLocaleString()} />
            <StatCard label="Engagement rate" value={`${sm?.engagementRate ?? 0}%`} />
          </div>
        )}
      </section>
      {!loading && !error && report?.configured && !report.error && (
        <>
          <Sparkline data={report.trend ?? []} />
          <div className="flex flex-wrap gap-3">
            <BarList title="Acquisition channels" rows={report.channels ?? []} />
            <BarList title="Top sources / mediums" rows={report.sources ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Campaigns" rows={report.campaigns ?? []} />
            <BarList title="Ad content (utm_content)" rows={report.adContent ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Events" rows={report.events ?? []} unit="events" />
            <BarList title="New vs returning" rows={report.newVsReturning ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Top landing pages" rows={report.landingPages ?? []} />
            <BarList title="Most viewed pages" rows={report.topPages ?? []} unit="views" />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Countries" rows={report.countries ?? []} />
            <BarList title="Cities" rows={report.cities ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Browsers" rows={report.browsers ?? []} />
            <BarList title="Operating systems" rows={report.operatingSystems ?? []} />
          </div>
          <div className="flex flex-wrap gap-3">
            <BarList title="Devices" rows={report.devices ?? []} />
          </div>
        </>
      )}
    </div>
  );
}


type ClarityMetric = { metricName: string; rows: Record<string, any>[] };
type ClarityReport = { configured: boolean; days?: number; cached?: boolean; dashboardUrl?: string | null; metrics?: ClarityMetric[] };

function ClarityPanel() {
  const [report, setReport] = useState<ClarityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError(null);
    api
      .get<{ data?: ClarityReport } & Partial<ClarityReport>>("/api/marketing/clarity", { params: { days: 3 } })
      .then((res) => { if (cancelled) return; const r = ((res as any)?.data ?? res) as ClarityReport; setReport(r ?? null); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Clarity"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return (
    <section className="drawer-section">
      <div className="flex items-center justify-between mb-3">
        <div className="drawer-section__title">Behavior · Microsoft Clarity <span style={{ color: "var(--ui-text-muted)", fontWeight: 400, fontSize: 12 }}>· last 3 days</span></div>
        {report?.configured && report?.dashboardUrl && (
          <a href={report.dashboardUrl} target="_blank" rel="noreferrer" className="ui-button ui-button--secondary" style={{ fontSize: 12 }}>Open heatmaps & recordings →</a>
        )}
      </div>
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading Clarity…</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && report && !report.configured && (
        <p style={{ color: "var(--ui-text-muted)" }}>Microsoft Clarity isn’t connected on the server yet. Add a Clarity Data Export API token and behavior metrics — sessions, engagement, scroll depth, and frustration signals (rage clicks, dead clicks, quick-backs) — will appear here. Heatmaps and session recordings open in the Clarity dashboard.</p>
      )}
      {!loading && !error && report?.configured && (report.metrics ?? []).length === 0 && (
        <p style={{ color: "var(--ui-text-muted)" }}>No Clarity data returned for the last 3 days yet.</p>
      )}
      {!loading && !error && report?.configured && (report.metrics ?? []).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {(report.metrics ?? []).map((m, i) => (
            <div key={i} style={{ flex: "1 1 240px", minWidth: 220, border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{m.metricName}</div>
              {(m.rows ?? []).slice(0, 8).map((row, j) => (
                <div key={j} style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 0", borderTop: j ? "1px solid var(--ui-border)" : "none" }}>
                  {Object.entries(row).map(([k, v]) => (
                    <span key={k} style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{k}: <strong style={{ color: "var(--ui-text)" }}>{String(v)}</strong></span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {report?.cached && <p style={{ color: "var(--ui-text-muted)", fontSize: 11, marginTop: 6 }}>Cached — Clarity allows only 10 pulls/day, so this refreshes periodically.</p>}
    </section>
  );
}

const MarketingDashboard = () => {
  const [tab, setTab] = useState<MarketingTab>("analytics");
  return <div className="space-y-4"><div className="flex flex-wrap gap-2">{MARKETING_TABS.map((entry) => <button key={entry.id} type="button" className={`ui-button ${tab === entry.id ? "ui-button--primary" : "ui-button--secondary"}`} onClick={() => setTab(entry.id)}>{entry.label}</button>)}</div>{tab === "google-ads" && <section className="drawer-section"><div className="drawer-section__title">Google Ads</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Google Ads spend, impressions, and conversions will appear here once the Ads account is linked.</p></section>}{tab === "linkedin-ads" && <section className="drawer-section"><div className="drawer-section__title">LinkedIn Ads</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. LinkedIn campaign data will mirror the Google Ads panel once linked.</p></section>}{tab === "analytics" && (<div className="space-y-4"><AnalyticsFunnel /><Ga4Panel /><ClarityPanel /></div>)}</div>;
};

export default MarketingDashboard;
