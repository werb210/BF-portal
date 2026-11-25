// BF_PORTAL_BLOCK_v197_BI_DASHBOARD_EXPAND_v2
// Operationally useful BI dashboard. Replaces the v56 5-tile
// placeholder with stage breakdown, carrier health, attention
// callouts, and recent updates. All data from endpoints shipped by
// v225 / v233 / v234.
import { useEffect, useMemo, useState } from "react";
import SiloBoard, { cardLink, FlowsTable, MUTED, Num, numGrid, type BoardSection, type FlowRow } from "@/pages/dashboard/SiloBoard"; // BF_PORTAL_SILO_DASHBOARDS_v1
import TeamMessagesCard from "@/pages/dashboard/TeamMessagesCard";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { BI_VISIBLE_PIPELINE_STAGES, biStageLabel, resolveStageId } from "@/silos/bi/pipeline/biStages";

const STAGES: Array<[string, string]> = BI_VISIBLE_PIPELINE_STAGES.map((stageId) => [stageId, biStageLabel(stageId)]);

function extractListResponse(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const candidates = [p.items, p.applications, p.data];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object" && Array.isArray((c as Record<string, unknown>).items)) {
      return (c as Record<string, unknown>).items as any[];
    }
  }
  return [];
}

function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return String(iso);
  const seconds = Math.floor((Date.now() - t) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type Tone = "neutral" | "good" | "warn" | "bad";

function appDisplayTitle(app: any): string {
  const trim = (v: any) => (typeof v === "string" ? v.trim() : "");
  const fullName = [trim(app?.applicant_first_name), trim(app?.applicant_last_name)].filter(Boolean).join(" ");
  return (
    trim(app?.title) ||
    trim(app?.company_name) ||
    trim(app?.applicant_company) ||
    fullName ||
    trim(app?.application_code) ||
    (app?.id ? `Application ${String(app.id).slice(0, 8)}` : "Untitled")
  );
}

// BF_PORTAL_SILO_DASHBOARDS_v1 - the BI Dashboard is a movable board (see SiloBoard). The figures are the same as
// before; each block is now a card that can be moved, resized, removed and added back. Email flows is new.
function useBiDashboard() {
  const [apps, setApps] = useState<any[]>([]);
  const [health, setHealth] = useState<any | null>(null);
  const [flows, setFlows] = useState<FlowRow[] | null>(null);
  const [flowsError, setFlowsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideDemo, setHideDemo] = useState<boolean>(() => {
    try { return localStorage.getItem("bi.dashboard.hide_demo") === "1"; } catch { return false; }
  });

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hideDemo]);
  useEffect(() => {
    api<any>("/api/v1/bi/flows")
      .then((r) => setFlows(Array.isArray(r?.flows) ? r.flows : []))
      .catch(() => setFlowsError(true));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = hideDemo ? "?hide_demo=true" : "";
      const [appList, hData] = await Promise.all([
        api<any>(`/api/v1/bi/applications${qs}`),
        api<any>("/api/v1/bi/carrier-health"),
      ]);
      setApps(extractListResponse(appList));
      setHealth(hData);
    } catch {
      setApps([]);
      setHealth(null);
      setError("Failed to load BI dashboard data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  function onHideDemoChange(v: boolean) {
    setHideDemo(v);
    try { localStorage.setItem("bi.dashboard.hide_demo", v ? "1" : "0"); } catch { /* noop */ }
  }

  const stageCounts: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of apps) {
      const st = resolveStageId(a?.stage) ?? String(a?.stage ?? "");
      out[st] = (out[st] || 0) + 1;
    }
    return out;
  }, [apps]);
  const awaitingDocs = useMemo(() => apps.filter((a) => !!a?.docs_deferred_at && a?.stage === "in_progress").length, [apps]);
  const submittedNoCarrier = useMemo(() => apps.filter((a) => a?.stage === "submitted" && !a?.carrier_received_at).length, [apps]);
  const declinedRecent = useMemo(() => apps.filter((a) => {
    const stage = a?.stage;
    if (stage !== "declined" && stage !== "information_required") return false;
    const t = a?.updated_at ? new Date(a.updated_at).getTime() : NaN;
    return Number.isFinite(t) && t > Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length, [apps]);
  const testCount = useMemo(() => apps.filter((a) => a?.is_demo === true).length, [apps]);
  const recent: any[] = useMemo(() => {
    const withDate = apps.filter((a) => !!a?.updated_at);
    withDate.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return withDate.slice(0, 8);
  }, [apps]);

  const total = apps.length;
  const visibleStageTotal = STAGES.reduce((sum, [stage]) => sum + (stageCounts[stage] || 0), 0);
  const prePipelineCount = Math.max(0, total - visibleStageTotal);
  const allDemoHidden = apps.length > 0 && apps.every((a) => a?.is_demo === true) && hideDemo;
  const rawHealthStatus: string = String(health?.status ?? "").toLowerCase();
  const healthErrors = Number(health?.errors_24h ?? 0);
  const hasCarrierActivity = Number(health?.submissions_24h ?? 0) > 0 || Number(health?.received_24h ?? 0) > 0;
  const healthStatus = rawHealthStatus === "idle" || (!hasCarrierActivity && healthErrors === 0) ? "No activity (24h)" : (rawHealthStatus ? rawHealthStatus.toUpperCase() : "—");
  const healthTone: Tone =
    healthErrors > 0 || rawHealthStatus === "error" || rawHealthStatus === "failed" ? "bad" :
    rawHealthStatus === "healthy" || rawHealthStatus === "active" ? "good" :
    rawHealthStatus === "degraded" ? "warn" : "neutral";

  return { apps, health, flows, flowsError, loading, error, hideDemo, load, onHideDemoChange, stageCounts, awaitingDocs, submittedNoCarrier, declinedRecent, testCount, recent, visibleStageTotal, prePipelineCount, allDemoHidden, healthStatus, healthTone };
}
type BiData = ReturnType<typeof useBiDashboard>;
const toneOf = (t: Tone) => (t === "neutral" ? undefined : t);

function Totals({ d }: { d: BiData }) {
  return (
    <div style={numGrid}>
      {/* BF_PORTAL_BLOCK_v609_FOUR_FIXES_v1 - pipeline stages only, as the pipeline view shows. */}
      <Num label="Total in pipeline" value={d.visibleStageTotal} hint={<Link to="/silo/bi/pipeline" style={cardLink}>Open pipeline</Link>} />
      <Num label="Carrier health" value={d.healthStatus} tone={toneOf(d.healthTone)}
        hint={d.health ? `${d.health.submissions_24h ?? 0} submitted / ${d.health.received_24h ?? 0} received / ${d.health.errors_24h ?? 0} errors (24h)` : "Loading…"} />
      {!d.hideDemo && d.testCount > 0 ? <Num label="TEST submissions" value={d.testCount} tone="warn" hint="Sandbox-key apps in pipeline" /> : null}
    </div>
  );
}
function Attention({ d }: { d: BiData }) {
  return (
    <div style={numGrid}>
      <Num label="Awaiting docs" value={d.awaitingDocs} tone={d.awaitingDocs > 0 ? "warn" : undefined} hint="Applicant deferred upload" />
      <Num label="Submitted, no carrier ack" value={d.submittedNoCarrier} tone={d.submittedNoCarrier > 0 ? "warn" : undefined} hint="Awaiting first carrier event" />
      <Num label="Declined / info req (7d)" value={d.declinedRecent} tone={d.declinedRecent > 0 ? "bad" : undefined} hint="May need staff follow-up" />
    </div>
  );
}
function Stages({ d }: { d: BiData }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
        {STAGES.map(([stage, label]) => (
          <Link key={stage} to={`/silo/bi/pipeline?stage=${stage}`} style={{ border: "1px solid #E4EAF2", borderRadius: 8, padding: 8, color: "inherit", textDecoration: "none" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: MUTED }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{d.stageCounts[stage] || 0}</div>
          </Link>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED }}>Not yet in the pipeline (drafts, scoring, ready for staff review): <strong style={{ color: "inherit" }}>{d.prePipelineCount}</strong></p>
    </div>
  );
}
function Recent({ d }: { d: BiData }) {
  if (!d.recent.length) return <p style={{ margin: 0, color: MUTED }}>No recent updates.</p>;
  return (
    <div>
      {d.recent.map((a) => {
        // BF_PORTAL_BI_DASH_NO_DELETE_v1 - deleting lives on the application, not one click away on the dashboard.
        const resolvedStage = resolveStageId(a?.stage) ?? a?.stage;
        const stageMeta = STAGES.find((row) => row[0] === resolvedStage);
        return (
          <Link key={a.id} to={`/silo/bi/pipeline/${a.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid #E4EAF2", color: "inherit", textDecoration: "none" }}>
            <div style={{ minWidth: 0 }}>
              <strong>{appDisplayTitle(a)}</strong>
              {a?.is_demo === true ? <span style={{ marginLeft: 6, fontSize: 10, color: "#B45309" }}>TEST</span> : null}
              {a?.carrier_last_event ? <span style={{ marginLeft: 6, fontSize: 11, color: "#1E3A8A" }}>carrier: {String(a.carrier_last_event)}</span> : null}
              <div style={{ fontSize: 12, color: MUTED }}>{a?.guarantor_name || "—"}{a?.lender_name ? <> · via {String(a.lender_name)}</> : null}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: MUTED, flexShrink: 0 }}>
              <div>{stageMeta ? stageMeta[1] : biStageLabel(a?.stage)}</div>
              <div>{relativeFromNow(a?.updated_at)}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/** The pipeline summary on its own (the "Insurance pipeline" card on the Reports page). */
export function BIPipelineOverview() {
  const d = useBiDashboard();
  return <div style={{ display: "grid", gap: 12 }}><Totals d={d} /><Attention d={d} /><Stages d={d} /></div>;
}

export default function BIDashboard() {
  const d = useBiDashboard();
  const sections: BoardSection[] = [
    { key: "bi_dash_totals", title: "Pipeline at a glance", size: "full", description: "Total in pipeline, carrier health and test files.", render: () => <Totals d={d} /> },
    { key: "bi_dash_attention", title: "Needs attention", size: "full", description: "Awaiting documents, no carrier acknowledgement, recent declines.", render: () => <Attention d={d} /> },
    { key: "bi_dash_stages", title: "Pipeline stages", size: "full", description: "Files in each stage, plus those not yet in the pipeline.", render: () => <Stages d={d} /> },
    { key: "bi_dash_flows", title: "Email flows", size: "full", description: "People in each email flow, emailed, opened and clicked.", render: () => <FlowsTable flows={d.flows} error={d.flowsError} /> },
    { key: "bi_dash_recent", title: "Recent updates", size: "full", description: "The latest applications to change.", render: () => <Recent d={d} /> },
    { key: "dash_team", title: "New team messages", size: "full", description: "Team conversations with unread messages.", standard: false, render: () => <TeamMessagesCard /> },
  ];
  const actions = (
    <>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={d.hideDemo} onChange={(e) => d.onHideDemoChange(e.target.checked)} /> Hide demo
      </label>
      <button type="button" className="ui-button ui-button--secondary" onClick={() => void d.load()}>Refresh</button>
    </>
  );
  return (
    <div>
      {d.loading ? <p style={{ fontSize: 13 }}>Loading…</p> : null}
      {d.error ? <div role="alert" style={{ marginBottom: 12, border: "1px solid #DC2626", borderRadius: 8, padding: 10, color: "#B91C1C", background: "#FEF2F2" }}>{d.error}</div> : null}
      {d.allDemoHidden ? <div style={{ marginBottom: 12, border: "1px solid #D97706", borderRadius: 8, padding: 10, background: "#FFFBEB", color: "#92400E" }}>All applications are currently demos. Untick Hide demo to fill the dashboard.</div> : null}
      <SiloBoard silo="BI" title="BI Dashboard" sections={sections} actions={actions} />
    </div>
  );
}
