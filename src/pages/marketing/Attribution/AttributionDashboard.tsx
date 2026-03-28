import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import type { AttributionDashboard as AttributionData } from "@/api/marketing.attribution";
import { useMarketingStore } from "@/state/marketing.store";

interface Props {
  data?: AttributionData;
  loading?: boolean;
}

const AttributionDashboard = ({ data, loading }: Props) => {
  const { dateRange, setDateRange } = useMarketingStore();

  return (
    <Card
      title="Attribution Dashboard"
      actions={
        <select className="input" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      }
    >
      {loading && <AppLoading />}
      {!loading && data && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="text-muted">Primary channels</div>
              <ul className="list-disc pl-5 space-y-1">
                {data.distribution.map((item) => (
                  <li key={item.channel}>
                    {item.channel}: {item.value}%
                  </li>
                ))}
              </ul>
            </div>
            <div className="stat-card">
              <div className="text-muted">Date range</div>
              <div className="text-lg">{data.dateRange}</div>
            </div>
          </div>
          <Table
            headers={[
              "Channel",
              "Leads",
              "Qualified",
              "Funded",
              "CPL",
              "CPQA",
              "CPF",
              "Avg Funding",
              "Funnel",
              "Lender preference"
            ]}
          >
            {data.channels.map((channel) => (
              <tr key={channel.channel}>
                <td>{channel.channel}</td>
                <td>{channel.leads}</td>
                <td>{channel.qualifiedApplications}</td>
                <td>{channel.fundedDeals}</td>
                <td>${channel.costPerLead.toFixed(2)}</td>
                <td>${channel.costPerQualifiedApp.toFixed(2)}</td>
                <td>${channel.costPerFundedDeal.toFixed(2)}</td>
                <td>${channel.averageFunding.toLocaleString()}</td>
                <td>{(channel.funnelConversion * 100).toFixed(1)}%</td>
                <td>{channel.lenderPreference}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Card>
  );
};

export default AttributionDashboard;
