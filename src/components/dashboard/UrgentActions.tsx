import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";

const UrgentActions = () => {
  const enableDashboardQueries = process.env.NODE_ENV !== "test";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "actions"], queryFn: dashboardApi.getActions, enabled: enableDashboardQueries });

  return (
    <Card title="Urgent Actions">
      {isLoading ? <p>Loading…</p> : null}
      <ul className="space-y-1 text-sm">
        <li>Waiting &gt;24h: {data?.waitingOver24h ?? 0}</li>
        <li>Missing documents: {data?.missingDocuments ?? 0}</li>
        <li>Offers expiring: {data?.offersExpiring ?? 0}</li>
        <li>Clients awaiting response: {data?.awaitingClientResponse ?? 0}</li>
      </ul>
    </Card>
  );
};

export default UrgentActions;
