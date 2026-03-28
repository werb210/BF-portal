import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";

const PipelineOverview = () => {
  const enableDashboardQueries = process.env.NODE_ENV !== "test";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "pipeline"], queryFn: dashboardApi.getPipeline, enabled: enableDashboardQueries });

  return (
    <Card title="Pipeline Overview">
      {isLoading ? <p>Loading…</p> : null}
      <ul className="space-y-1 text-sm">
        <li>New Applications: {data?.newApplications ?? 0}</li>
        <li>In Review: {data?.inReview ?? 0}</li>
        <li>Requires Docs: {data?.requiresDocs ?? 0}</li>
        <li>Sent to Lender: {data?.sentToLender ?? 0}</li>
        <li>Offers Received: {data?.offersReceived ?? 0}</li>
        <li>Closed: {data?.closed ?? 0}</li>
        <li>Declined: {data?.declined ?? 0}</li>
      </ul>
    </Card>
  );
};

export default PipelineOverview;
