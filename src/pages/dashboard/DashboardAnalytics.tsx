import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type RangeDays = 7 | 30 | 90 | 365;
type Funnel = { visits: number; applications: number; submitted: number; funded: number };
type Row = { name: string; value?: number; count?: number; applications?: number; funded?: number; approvals?: number; approvalRate?: number; revenue?: number; issueRate?: number };
type Analytics = {
  revenueFunnel?: Funnel;
  applicationFunnel?: Record<string, number>;
  acquisitionChannels?: Row[];
  marketingPerformance?: Row[];
  fundingByProduct?: Row[];
  documentUploadIssues?: Row[];
  topLendersByApprovalRate?: Row[];
};

const ranges: RangeDays[] = [7, 30, 90, 365];
const fallback: Required<Analytics> = {
  revenueFunnel: { visits: 0, applications: 0, submitted: 0, funded: 0 },
  applicationFunnel: {},
  acquisitionChannels: [],
  marketingPerformance: [],
  fundingByProduct: [],
  documentUploadIssues: [],
  topLendersByApprovalRate: [],
};
const fmt = (n?: number) => (n ?? 0).toLocaleString();
const pct = (part?: number, total?: number) => total ? `${Math.round(((part ?? 0) / total) * 100)}%` : "0%";
const statValue = { color: "var(--ui-text)", fontSize: 24, lineHeight: 1.1 } as const;
const statHint = { color: "var(--ui-text-muted)", fontSize: 12 } as const;

function MiniTable({ title, rows, valueLabel }: { title: string; rows: Row[]; valueLabel: (row: Row) => string }) {
  return (
    <div className="drawer-section" style={{ padding: 16 }}>
      <div className="drawer-section__title" style={{ marginBottom: 10 }}>{title}</div>
      {rows.length === 0 ? <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No data for this range.</div> : rows.slice(0, 6).map((row) => (
        <div key={row.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: "1px solid var(--ui-border, #eaf0f6)" }}>
          <span style={{ color: "var(--ui-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
          <span style={{ color: "var(--ui-text-muted)", whiteSpace: "nowrap" }}>{valueLabel(row)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardAnalytics() {
  const [range, setRange] = useState<RangeDays>(30);
  const [data, setData] = useState<Analytics>(fallback);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setError(null);
    api.get<Analytics>(`/api/dashboard/analytics?range=${range}`).then((payload) => alive && setData(payload ?? fallback)).catch(() => alive && setError("Analytics are unavailable right now."));
    return () => { alive = false; };
  }, [range]);
  const merged = useMemo(() => ({ ...fallback, ...data }), [data]);
  const f = merged.revenueFunnel;
  const stages = Object.entries(merged.applicationFunnel);
  const maxStage = Math.max(1, ...stages.map(([, v]) => v));
  return (
    <section aria-label="Dashboard analytics" className="space-y-4" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div><h2 className="text-xl font-semibold" style={{ margin: 0 }}>Analytics</h2><p style={{ margin: "4px 0 0", color: "var(--ui-text-muted)", fontSize: 13 }}>Revenue funnel, drop-offs, acquisition, marketing, funding, documents, and lender performance.</p></div>
        <div role="group" aria-label="Analytics date range" style={{ display: "flex", gap: 6 }}>{ranges.map((days) => <button key={days} type="button" onClick={() => setRange(days)} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid var(--ui-border)", background: range === days ? "var(--ui-accent-blue)" : "transparent", color: range === days ? "#fff" : "var(--ui-text)" }}>{days}d</button>)}</div>
      </div>
      {error && <div className="drawer-section" style={{ color: "var(--ui-text-muted)", padding: 12 }}>{error}</div>}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="drawer-section"><div className="drawer-section__title">GA4 Visits</div><strong style={statValue}>{fmt(f.visits)}</strong></div>
        <div className="drawer-section"><div className="drawer-section__title">Applications</div><strong style={statValue}>{fmt(f.applications)}</strong><small style={statHint}> {pct(f.applications, f.visits)} of visits</small></div>
        <div className="drawer-section"><div className="drawer-section__title">Submitted</div><strong style={statValue}>{fmt(f.submitted)}</strong><small style={statHint}> {pct(f.submitted, f.applications)} of apps</small></div>
        <div className="drawer-section"><div className="drawer-section__title">Funded</div><strong style={statValue}>{fmt(f.funded)}</strong><small style={statHint}> {pct(f.funded, f.submitted)} of submitted</small></div>
      </div>
      <div className="drawer-section" style={{ padding: 16 }}><div className="drawer-section__title">Application funnel & drop-offs</div>{stages.length === 0 ? <p style={{ color: "var(--ui-text-muted)" }}>No funnel data for this range.</p> : stages.map(([stage, count]) => <div key={stage} style={{ display: "grid", gridTemplateColumns: "160px 1fr 70px", gap: 10, alignItems: "center", marginTop: 8 }}><span>{stage}</span><div style={{ height: 8, background: "var(--ui-surface-strong)", borderRadius: 99 }}><div style={{ height: "100%", width: `${Math.round((count / maxStage) * 100)}%`, background: "var(--ui-accent-blue)", borderRadius: 99 }} /></div><strong style={{ textAlign: "right" }}>{fmt(count)}</strong></div>)}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <MiniTable title="Acquisition channels" rows={merged.acquisitionChannels} valueLabel={(r) => `${fmt(r.applications ?? r.count ?? r.value)} apps`} />
        <MiniTable title="Marketing performance" rows={merged.marketingPerformance} valueLabel={(r) => `$${fmt(r.revenue ?? r.value)}`} />
        <MiniTable title="Funding by product" rows={merged.fundingByProduct} valueLabel={(r) => `${fmt(r.funded ?? r.count ?? r.value)} funded`} />
        <MiniTable title="Document upload issues" rows={merged.documentUploadIssues} valueLabel={(r) => r.issueRate !== undefined ? `${r.issueRate}% issue rate` : `${fmt(r.count ?? r.value)} issues`} />
        <MiniTable title="Top lenders by approval rate" rows={merged.topLendersByApprovalRate} valueLabel={(r) => r.approvalRate !== undefined ? `${r.approvalRate}% approvals` : `${fmt(r.approvals ?? r.value)} approvals`} />
      </div>
    </section>
  );
}
