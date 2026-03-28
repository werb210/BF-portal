import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";

const DocumentHealth = () => {
  const enableDashboardQueries = process.env.NODE_ENV !== "test";
  const { data, isLoading } = useQuery({ queryKey: ["dashboard", "document-health"], queryFn: dashboardApi.getDocumentHealth, enabled: enableDashboardQueries });

  return (
    <Card title="Document Health">
      {isLoading ? <p>Loading…</p> : null}
      <ul className="space-y-1 text-sm">
        <li>Missing bank statements: {data?.missingBankStatements ?? 0}</li>
        <li>Missing AR aging: {data?.missingArAging ?? 0}</li>
        <li>Rejected documents: {data?.rejectedDocuments ?? 0}</li>
      </ul>
    </Card>
  );
};

export default DocumentHealth;
