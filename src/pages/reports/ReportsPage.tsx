// BF_PORTAL_REPORTS_UI_v1 - real Reports page over the existing dashboard endpoints.
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

type Metrics = {
  activeApplications?: number;
  dealsWonThisMonth?: number;
  commissionEarned?: number;
  pipelineByStage?: Record<string, number>;
  commissionByStage?: Record<string, number>;
};
type FunnelStep = { label: string; count: number; conversionFromPrev?: number };
type FundingRow = { product: string; total?: number | string; funded?: number | string };

const money = (n: unknown) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ReportsPage(): JSX.Element {
  const [m, setM] = useState<Metrics>({});
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [funding, setFunding] = useState<FundingRow[]>([]);

  useEffect(() => {
    (async () => {
      try { const r = await api.get<Metrics>("/api/dashboard/metrics"); setM(r ?? {}); } catch { /* ignore */ }
      try {
        const r = await api.get<{ steps?: FunnelStep[] } | FunnelStep[]>("/api/dashboard/funnel");
        setFunnel(Array.isArray(r) ? r : (r?.steps ?? []));
      } catch { /* ignore */ }
      try {
        const r = await api.get<{ rows?: FundingRow[] } | FundingRow[]>("/api/dashboard/funding-by-product");
        setFunding(Array.isArray(r) ? r : (r?.rows ?? []));
      } catch { /* ignore */ }
    })();
  }, []);

  const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, background: "var(--ui-surface-strong)" };
  const kpi: CSSProperties = { ...card, flex: 1 };
  const barTrack: CSSProperties = { height: 8, background: "var(--ui-surface-muted, #eef2f6)", borderRadius: 4, overflow: "hidden", marginTop: 4 };
  const th: CSSProperties = { textAlign: "left", fontSize: 12, color: "var(--ui-text-muted)", padding: "6px 8px" };
  const td: CSSProperties = { fontSize: 13, padding: "6px 8px", borderTop: "1px solid var(--ui-border)" };

  const stageEntries = Object.entries(m.pipelineByStage ?? {});
  const maxStage = Math.max(1, ...stageEntries.map(([, v]) => Number(v) || 0));
  const commissionEntries = Object.entries(m.commissionByStage ?? {});

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Reports</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={kpi}><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Active applications</div><div style={{ fontSize: 26, fontWeight: 700 }}>{m.activeApplications ?? 0}</div></div>
        <div style={kpi}><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Deals won this month</div><div style={{ fontSize: 26, fontWeight: 700 }}>{m.dealsWonThisMonth ?? 0}</div></div>
        <div style={kpi}><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Commission earned</div><div style={{ fontSize: 26, fontWeight: 700 }}>{money(m.commissionEarned)}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Pipeline by stage</div>
          {stageEntries.length === 0 ? <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No data.</div> : stageEntries.map(([stage, count]) => (
            <div key={stage} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{stage}</span><span style={{ fontWeight: 600 }}>{count}</span></div>
              <div style={barTrack}><div style={{ height: "100%", width: `${((Number(count) || 0) / maxStage) * 100}%`, background: "var(--ui-accent-blue, #0091ae)" }} /></div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Projected commission by stage</div>
          {commissionEntries.length === 0 ? <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No data.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Stage</th><th style={{ ...th, textAlign: "right" }}>Commission</th></tr></thead>
              <tbody>{commissionEntries.map(([stage, amt]) => (
                <tr key={stage}><td style={td}>{stage}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(amt)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Application funnel</div>
          {funnel.length === 0 ? <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No data.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Step</th><th style={{ ...th, textAlign: "right" }}>Count</th><th style={{ ...th, textAlign: "right" }}>Conv.</th></tr></thead>
              <tbody>{funnel.map((s, i) => (
                <tr key={i}><td style={td}>{s.label}</td><td style={{ ...td, textAlign: "right" }}>{s.count}</td><td style={{ ...td, textAlign: "right", color: "var(--ui-text-muted)" }}>{i === 0 ? "—" : `${s.conversionFromPrev ?? 0}%`}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Funding by product</div>
          {funding.length === 0 ? <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No data.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Product</th><th style={{ ...th, textAlign: "right" }}>Funded</th></tr></thead>
              <tbody>{funding.map((r, i) => (
                <tr key={i}><td style={td}>{r.product}</td><td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(r.funded ?? r.total)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
