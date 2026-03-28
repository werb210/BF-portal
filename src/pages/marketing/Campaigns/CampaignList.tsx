import { useState } from "react";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns, type Campaign } from "@/api/marketing.campaigns";
import CampaignEditor from "./CampaignEditor";

const CampaignList = () => {
  const { data, isLoading } = useQuery({ queryKey: ["campaigns"], queryFn: fetchCampaigns });
  const [selected, setSelected] = useState<Campaign | undefined>();
  const [editing, setEditing] = useState(false);

  return (
    <Card title="Campaigns" actions={<Button onClick={() => setEditing(true)}>New campaign</Button>}>
      {isLoading && <AppLoading />}
      {!isLoading && (
        <Table headers={["Name", "Platform", "Budget", "Spend", "Status", "Qualified", "Funded"]}>
          {(data || []).map((campaign) => (
            <tr key={campaign.id}>
              <td>{campaign.name}</td>
              <td>{campaign.platform}</td>
              <td>${campaign.budget.toLocaleString()}</td>
              <td>${campaign.spend.toLocaleString()}</td>
              <td className="capitalize">{campaign.status}</td>
              <td>{campaign.qualifiedApplications}</td>
              <td>{campaign.fundedDeals}</td>
              <td>
                <Button variant="ghost" onClick={() => setSelected(campaign)}>
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {(editing || selected) && <CampaignEditor campaign={selected} onClose={() => { setSelected(undefined); setEditing(false); }} />}
    </Card>
  );
};

export default CampaignList;
