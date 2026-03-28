import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";

const DealMetrics = () => {
  const enableDashboardQueries = process.env.NODE_ENV !== "test";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "metrics"], queryFn: dashboardApi.getMetrics, enabled: enableDashboardQueries });

  return (
    <Card title="Deal Metrics">
      {isLoading ? <p>Loading…</p> : null}
      <ul className="space-y-1 text-sm">
        <li>Average deal size: ${Math.round(data?.averageDealSize ?? 0).toLocaleString()}</li>
        <li>Approval rate: {Number(data?.approvalRate ?? 0).toFixed(1)}%</li>
        <li>Average approval time: {Number(data?.averageApprovalTimeDays ?? 0).toFixed(1)} days</li>
        <li>Lender response time: {Number(data?.lenderResponseTimeDays ?? 0).toFixed(1)} days</li>
      </ul>
    </Card>
  );
};

export default DealMetrics;
