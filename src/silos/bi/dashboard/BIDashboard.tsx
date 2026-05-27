// BF_PORTAL_BLOCK_v197_BI_DASHBOARD_EXPAND_v2
// Operationally useful BI dashboard. Replaces the v56 5-tile
// placeholder with stage breakdown, carrier health, attention
// callouts, and recent updates. All data from endpoints shipped by
// v225 / v233 / v234.
import { useEffect, useMemo, useState } from "react";
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

function StatPill(props: { label: string; value: number | string; tone?: Tone; hint?: string }) {
  const { label, value, tone = "neutral" as Tone, hint } = props;
  const toneColor =
    tone === "good" ? "border-emerald-500/40 bg-emerald-500/5" :
    tone === "warn" ? "border-amber-500/40 bg-amber-500/5" :
    tone === "bad"  ? "border-red-500/40 bg-red-500/5" :
    "border-card bg-brand-surface";
  return (
    <div className={`rounded-xl border ${toneColor} p-4`}>
      <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

export default function BIDashboard() {
  const [apps, setApps] = useState<any[]>([]);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideDemo, setHideDemo] = useState<boolean>(() => {
    try { return localStorage.getItem("bi.dashboard.hide_demo") === "1"; } catch { return false; }
  });

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hideDemo]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = hideDemo ? "?hide_demo=true" : "";
      const [appList, hData] = await Promise.all([
        api<any>(`/api/v1/bi/applications${qs}`),
        api<any>("/api/v1/bi/carrier-health"),
      ]);
      const list: any[] = extractListResponse(appList);
      setApps(list);
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
      const s = resolveStageId(a?.stage) ?? String(a?.stage ?? "");
      out[s] = (out[s] || 0) + 1;
    }
    return out;
  }, [apps]);

  const awaitingDocs = useMemo(
    () => apps.filter((a) => !!a?.docs_deferred_at && a?.stage === "in_progress").length,
    [apps],
  );
  const submittedNoCarrier = useMemo(
    () => apps.filter((a) => a?.stage === "submitted" && !a?.carrier_received_at).length,
    [apps],
  );
  const declinedRecent = useMemo(
    () => apps.filter((a) => {
      const stage = a?.stage;
      if (stage !== "declined" && stage !== "information_required") return false;
      if (!a?.updated_at) return false;
      const t = new Date(a.updated_at).getTime();
      if (!Number.isFinite(t)) return false;
      return t > Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length,
    [apps],
  );
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

  return (
    <div className="text-white">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-semibold">BI Dashboard</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-white/70">
            <input type="checkbox" checked={hideDemo} onChange={(e) => onHideDemoChange(e.target.checked)} />
            Hide demo
          </label>
          <button onClick={() => void load()} className="rounded border border-card px-3 py-1 text-white/70 hover:text-white">
            Refresh
          </button>
        </div>
      </div>

      {loading ? <div className="text-white/50 text-sm mb-4">Loading…</div> : null}
      {error ? <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      {allDemoHidden ? (
        <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          All applications are currently demos. Toggle Hide Demo to populate dashboard.
          <label className="ml-2 inline-flex items-center gap-2">
            <input type="checkbox" checked={hideDemo} onChange={(e) => onHideDemoChange(e.target.checked)} />
            Hide demo
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mb-6">
        {/* BF_PORTAL_BLOCK_v609_FOUR_FIXES_v1 — was `total` (all apps incl. pre-pipeline created/in_progress/ready_for_submission) which inflated the dashboard above what the pipeline view actually showed. */}
        <StatPill label="Total in pipeline" value={visibleStageTotal} />
        <StatPill
          label="Carrier health"
          value={healthStatus}
          tone={healthTone}
          hint={
            health
              ? `${health.submissions_24h ?? 0} submitted / ${health.received_24h ?? 0} received / ${health.errors_24h ?? 0} errors (24h)`
              : "Loading…"
          }
        />
        {!hideDemo && testCount > 0 ? (
          <StatPill label="TEST submissions" value={testCount} tone="warn" hint="Sandbox-key apps in pipeline" />
        ) : null}
        <Link to="/silo/bi/pipeline" className="rounded-xl border border-card bg-brand-surface p-4 hover:bg-white/5">
          <div className="text-xs uppercase tracking-widest text-white/60">Open pipeline</div>
          <div className="mt-2 text-2xl font-semibold text-blue-300">→</div>
          <div className="mt-1 text-xs text-white/50">All stages, all lenders</div>
        </Link>
      </div>

      <h3 className="text-lg font-semibold mb-3 text-white/80">Needs attention</h3>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatPill label="Awaiting docs" value={awaitingDocs} tone={awaitingDocs > 0 ? "warn" : "neutral"} hint="Applicant deferred upload" />
        <StatPill label="Submitted, no carrier ack" value={submittedNoCarrier} tone={submittedNoCarrier > 0 ? "warn" : "neutral"} hint="Awaiting first carrier event" />
        <StatPill label="Declined / info req (7d)" value={declinedRecent} tone={declinedRecent > 0 ? "bad" : "neutral"} hint="May need staff follow-up" />
      </div>

      <h3 className="text-lg font-semibold mb-3 text-white/80">Pipeline stages</h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-2">
        {STAGES.map(([stage, label]) => (
          <Link key={stage} to={`/silo/bi/pipeline?stage=${stage}`} className="rounded-lg border border-card bg-brand-surface p-3 hover:bg-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
            <div className="mt-1 text-xl font-semibold">{stageCounts[stage] || 0}</div>
          </Link>
        ))}
      </div>
      <div className="mb-6">
        <div className="rounded bg-slate-700/50 p-3 text-sm">
          <div className="text-slate-300">PRE-PIPELINE (not in columns)</div>
          <div className="mt-1 text-2xl font-semibold">{prePipelineCount}</div>
          <div className="text-xs text-slate-400">Drafts, scoring, ready for staff review</div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-3 text-white/80">Recent updates</h3>
      <div className="rounded-xl border border-card bg-brand-surface overflow-hidden">
        {recent.length === 0 ? (
          <div className="p-4 text-sm text-white/40">No recent updates.</div>
        ) : recent.map((a) => {
          const onDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            if (!window.confirm(`Delete ${appDisplayTitle(a)}? This cannot be undone.`)) return;
            try {
              await api(`/api/v1/bi/applications/${a.id}`, { method: "DELETE" });
              setApps((prev) => prev.filter((app) => app?.id !== a.id));
              window.alert("Application deleted.");
            } catch (error) {
              console.error("Failed to delete BI application", error);
              window.alert("Failed to delete application.");
            }
          };
          const name = appDisplayTitle(a);
          const resolvedStage = resolveStageId(a?.stage) ?? a?.stage;
          const stageMeta = STAGES.find((row) => row[0] === resolvedStage);
          return (
            <Link key={a.id} to={`/silo/bi/pipeline/${a.id}`} className="flex items-center justify-between gap-3 border-b border-white/5 p-3 hover:bg-white/5 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{name}</span>
                  {a?.is_demo === true ? (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] tracking-wider text-amber-200 border border-amber-500/30">TEST</span>
                  ) : null}
                  {a?.carrier_last_event ? (
                    <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-200 border border-blue-500/30">carrier: {String(a.carrier_last_event)}</span>
                  ) : null}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {a?.guarantor_name || "—"}
                  {a?.lender_name ? <> · via {String(a.lender_name)}</> : null}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button type="button" onClick={onDelete} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10">Delete</button>
                <div className="text-right text-xs text-white/60">
                <div>{stageMeta ? stageMeta[1] : biStageLabel(a?.stage)}</div>
                <div className="text-white/40">{relativeFromNow(a?.updated_at)}</div>
              </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
