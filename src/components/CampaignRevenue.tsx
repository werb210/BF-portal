import { useEffect, useState } from "react";
import { api } from "@/api";

interface CampaignData {
  utm_campaign: string;
  fundedAmount: number;
  commission: number;
}

export default function CampaignRevenue() {
  const [data, setData] = useState<CampaignData[]>([]);

  useEffect(() => {
    api<CampaignData[]>("/analytics/campaign-revenue")
      .then(setData)
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="grid gap-3">
      {data.map((campaign) => (
        <div key={campaign.utm_campaign} className="rounded border border-slate-200 p-3">
          <h4 className="font-semibold">{campaign.utm_campaign}</h4>
          <p>Funded: ${campaign.fundedAmount}</p>
          <p>Commission: ${campaign.commission}</p>
        </div>
      ))}
    </div>
  );
}
