import { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api";
import { useSilo } from "@/context/SiloContext";
// BF_PORTAL_DASHBOARD_ANALYTICS_v1
import DashboardAnalytics from "@/pages/dashboard/DashboardAnalytics";

type DashboardMetrics = {
  activeApplications: number;
  pipelineByStage: Record<string, number>;
  commissionByStage?: Record<string, number>;
  dealsWonThisMonth: number;
  commissionEarned: number;
  newLeadsToday: number;
};

// BF_PORTAL_BLOCK_v_DASHBOARD_DENSITY_v1 — bigger stat values, a real per-stage
// breakdown (was a run-on "A 1 · B 3 · C 1" string), and a Pipeline-at-a-glance
// section so the page isn't 90% empty.
const StatCard = ({ label, value, focus }: { label: string; value: string; focus?: string }) => (
  <div className="drawer-section" data-dashboard-focus={focus} tabIndex={focus ? -1 : undefined}>
    <div className="drawer-section__title">{label}</div>
    <div
      style={{
        color: "var(--ui-text)",
        fontSize: 26,
        fontWeight: 700,
        lineHeight: 1.1,
        marginTop: 4,
      }}
    >
      {value}
    </div>
  </div>
);

const DashboardPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const silo = useSilo()?.silo ?? "BF";
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-dashboard-focus="${focus}"]`)?.focus({ preventScroll: false }));
  }, [searchParams]);

  const loadDashboard = useCallback(() => {
    // BF_PORTAL_DASHBOARD_SILO_REFETCH_v1 — discard the previous business
    // unit's figures before loading metrics through the active silo.
    setMetrics(null);
    setLoadFailed(false);
    return api<DashboardMetrics>(`/api/dashboard/metrics?silo=${encodeURIComponent(silo.toUpperCase())}`)
      .then((nextMetrics) => {
        setMetrics(nextMetrics);
      })
      .catch(() => {
        setMetrics(null);
        setLoadFailed(true);
      });
  }, [silo]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadDashboard();
  }, [isAuthenticated, loadDashboard]);

  if (isLoading) return <AppLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const fmt = (n: number | undefined) =>
    n !== undefined ? n.toLocaleString() : "—";
  const stages = metrics?.pipelineByStage
    ? Object.entries(metrics.pipelineByStage)
    : [];
  const totalInPipeline = stages.reduce((a, [, v]) => a + (v || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {loadFailed && (
        <div
          role="alert"
          className="drawer-section"
          style={{
            alignItems: "center",
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ color: "var(--ui-text)", fontWeight: 700 }}>
              {"Couldn't load dashboard data"}
            </div>
            <div style={{ color: "var(--ui-text-muted)", fontSize: 13, marginTop: 2 }}>
              The dashboard service may be temporarily unavailable. Your data has not been removed.
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void loadDashboard()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Active Applications" value={fmt(metrics?.activeApplications)} />
        <StatCard label="Deals Won This Month" value={fmt(metrics?.dealsWonThisMonth)} />
        <StatCard
          label="Commission Earned"
          focus="commission"
          value={
            metrics?.commissionEarned !== undefined
              ? `$${fmt(metrics.commissionEarned)}`
              : "—"
          }
        />
        <StatCard label="New Leads Today" value={fmt(metrics?.newLeadsToday)} />
      </div>

      <div className="drawer-section" style={{ padding: "16px 18px" }}>
        <div className="drawer-section__title" style={{ marginBottom: 12 }}>
          Pipeline by Stage &middot; Projected Commission
        </div>
        {metrics !== null && stages.length === 0 ? (
          <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>
            No applications in the pipeline yet.
          </div>
        ) : stages.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {stages.map(([stage, count]) => {
              const pct =
                totalInPipeline > 0
                  ? Math.round((count / totalInPipeline) * 100)
                  : 0;
              const stageCommission = metrics?.commissionByStage?.[stage] ?? 0;
              return (
                <div
                  key={stage}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr 40px 110px",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      color: "var(--ui-text)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {stage}
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "var(--ui-surface-strong)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--ui-accent-blue)",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      color: "var(--ui-text)",
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </div>
                  <div
                    style={{
                      color: "var(--ui-text-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                    title="Projected BF commission in this stage"
                  >
                    ${stageCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* BF_PORTAL_DASHBOARD_ANALYTICS_v1 */}
      <DashboardAnalytics />
    </div>
  );
};

export default DashboardPage;
