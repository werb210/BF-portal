import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";

const LenderActivity = () => {
  const enableDashboardQueries = process.env.NODE_ENV !== "test";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "lender-activity"], queryFn: dashboardApi.getLenderActivity, enabled: enableDashboardQueries });

  return (
    <Card title="Lender Submissions">
      {isLoading ? <p>Loading…</p> : null}
      <ul className="space-y-1 text-sm">
        <li>Recent submissions: {data?.recentSubmissions ?? 0}</li>
        <li>Awaiting lender response: {data?.awaitingLenderResponse ?? 0}</li>
        <li>Declined submissions: {data?.declinedSubmissions ?? 0}</li>
      </ul>
    </Card>
  );
};

export default LenderActivity;
