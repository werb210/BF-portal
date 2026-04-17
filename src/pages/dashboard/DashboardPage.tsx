import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api";

type DashboardMetrics = {
  activeApplications: number;
  pipelineByStage: Record<string, number>;
  dealsWonThisMonth: number;
  commissionEarned: number;
  newLeadsToday: number;
};

const DashboardPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    api<DashboardMetrics>("/api/dashboard/metrics")
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, [isAuthenticated]);

  if (isLoading) return <AppLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const fmt = (n: number | undefined) =>
    n !== undefined ? n.toLocaleString() : "—";

  const stageStr = metrics?.pipelineByStage
    ? Object.entries(metrics.pipelineByStage)
      .map(([k, v]) => `${k} ${v}`)
      .join(" · ")
    : "—";

  return (
    <div className="page dashboard-page">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome back, {user?.name}. Here is your operating snapshot.</p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <span className="dashboard-card__label">Active Applications</span>
          <strong className="dashboard-card__value">{fmt(metrics?.activeApplications)}</strong>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Pipeline by Stage</span>
          <strong className="dashboard-card__value dashboard-card__value--small">{stageStr}</strong>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Deals Won This Month</span>
          <strong className="dashboard-card__value">{fmt(metrics?.dealsWonThisMonth)}</strong>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Commission Earned</span>
          <strong className="dashboard-card__value">
            {metrics?.commissionEarned !== undefined ? `$${fmt(metrics.commissionEarned)}` : "—"}
          </strong>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">New Leads Today</span>
          <strong className="dashboard-card__value">{fmt(metrics?.newLeadsToday)}</strong>
        </article>
      </div>

      {!metrics && (
        <div className="ui-empty-state">
          <div className="ui-empty-state__icon" aria-hidden="true">📊</div>
          <h3>Metrics are still syncing</h3>
          <p>Try refreshing to load the latest dashboard numbers.</p>
          <button type="button" className="ui-button ui-button--secondary" onClick={() => window.location.reload()}>
            Refresh Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
