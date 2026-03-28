import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "@/api/marketing.campaigns";

const CampaignAnalytics = () => {
  const { data, isLoading } = useQuery({ queryKey: ["campaign-analytics"], queryFn: fetchCampaigns });

  const totals = (data || []).reduce(
    (acc, item) => {
      acc.spend += item.spend;
      acc.conversions += item.conversions;
      acc.funded += item.fundedDeals;
      return acc;
    },
    { spend: 0, conversions: 0, funded: 0 }
  );

  return (
    <Card title="Campaign Analytics">
      {isLoading && <AppLoading />}
      {!isLoading && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="text-muted">Total spend</div>
              <div className="text-2xl">${totals.spend.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="text-muted">Total conversions</div>
              <div className="text-2xl">{totals.conversions}</div>
            </div>
            <div className="stat-card">
              <div className="text-muted">Funded deals</div>
              <div className="text-2xl">{totals.funded}</div>
            </div>
          </div>
          <Table headers={["Campaign", "Platform", "Conversions", "Avg Funding"]}>
            {(data || []).map((camp) => (
              <tr key={camp.id}>
                <td>{camp.name}</td>
                <td>{camp.platform}</td>
                <td>{camp.conversions}</td>
                <td>${camp.averageFunding.toLocaleString()}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Card>
  );
};

export default CampaignAnalytics;
