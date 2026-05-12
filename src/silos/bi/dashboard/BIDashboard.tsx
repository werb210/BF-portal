// BF_PORTAL_BLOCK_v197_BI_DASHBOARD_EXPAND_v2
// Operationally useful BI dashboard. Replaces the v56 5-tile
// placeholder with stage breakdown, carrier health, attention
// callouts, and recent updates. All data from endpoints shipped by
// v225 / v233 / v234.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";

const STAGES: Array<[string, string]> = [
  ["new_application",    "New"],
  ["in_progress",        "In Progress"],
  ["document_review",    "Doc Review"],
  ["submitted",          "Submitted"],
  ["under_review",       "Under Review"],
  ["approved",           "Approved"],
  ["declined",           "Declined"],
  ["policy_issued",      "Policy Issued"],
];

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
  const [hideDemo, setHideDemo] = useState<boolean>(() => {
    try { return localStorage.getItem("bi.dashboard.hide_demo") === "1"; } catch { return false; }
  });

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hideDemo]);

  async function load() {
    setLoading(true);
    try {
      const qs = hideDemo ? "?hide_demo=true" : "";
      const appList: any = await api<any>(`/api/v1/bi/applications${qs}`).catch(() => []);
      const hData: any = await api<any>("/api/v1/bi/carrier-health").catch(() => null);
      const list: any[] = Array.isArray(appList)
        ? appList
        : (appList && Array.isArray(appList.applications) ? appList.applications : []);
      setApps(list);
      setHealth(hData);
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
      const s = String(a?.stage ?? "");
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
  const healthStatus: string = String(health?.status ?? "");
  const healthTone: Tone =
    healthStatus === "healthy" ? "good" :
    healthStatus === "degraded" ? "warn" : "neutral";

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

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mb-6">
        <StatPill label="Total in pipeline" value={total} />
        <StatPill
          label="Carrier health"
          value={healthStatus ? healthStatus.toUpperCase() : "—"}
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
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-6">
        {STAGES.map(([stage, label]) => (
          <Link key={stage} to={`/silo/bi/pipeline?stage=${stage}`} className="rounded-lg border border-card bg-brand-surface p-3 hover:bg-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
            <div className="mt-1 text-xl font-semibold">{stageCounts[stage] || 0}</div>
          </Link>
        ))}
      </div>

      <h3 className="text-lg font-semibold mb-3 text-white/80">Recent updates</h3>
      <div className="rounded-xl border border-card bg-brand-surface overflow-hidden">
        {recent.length === 0 ? (
          <div className="p-4 text-sm text-white/40">No recent updates.</div>
        ) : recent.map((a) => {
          const name = a?.business_name || a?.company_name || "Untitled";
          const stageMeta = STAGES.find((row) => row[0] === a?.stage);
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
              <div className="text-right text-xs text-white/60 shrink-0">
                <div>{stageMeta ? stageMeta[1] : String(a?.stage ?? "")}</div>
                <div className="text-white/40">{relativeFromNow(a?.updated_at)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
