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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-5">
        <div className="drawer-section"><div className="drawer-section__title">Active Applications</div><div>{fmt(metrics?.activeApplications)}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Pipeline by Stage</div><div style={{ fontSize: 12 }}>{stageStr}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Deals Won This Month</div><div>{fmt(metrics?.dealsWonThisMonth)}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">Commission Earned</div><div>{metrics?.commissionEarned !== undefined ? `$${fmt(metrics.commissionEarned)}` : "—"}</div></div>
        <div className="drawer-section"><div className="drawer-section__title">New Leads Today</div><div>{fmt(metrics?.newLeadsToday)}</div></div>
      </div>
    </div>
  );
};

export default DashboardPage;
