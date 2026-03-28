export type Campaign = {
  id: string;
  name: string;
  platform: "Google" | "Meta" | "Twitter" | "LinkedIn";
  status: "active" | "paused" | "draft";
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  qualifiedApplications: number;
  fundedDeals: number;
  averageFunding: number;
};

let campaigns: Campaign[] = [
  {
    id: "camp-1",
    name: "SMB Loans",
    platform: "Google",
    status: "active",
    budget: 5000,
    spend: 2100,
    impressions: 52000,
    clicks: 2400,
    conversions: 120,
    qualifiedApplications: 62,
    fundedDeals: 28,
    averageFunding: 120000
  },
  {
    id: "camp-2",
    name: "Equipment Financing",
    platform: "Meta",
    status: "active",
    budget: 3200,
    spend: 1700,
    impressions: 36000,
    clicks: 1500,
    conversions: 80,
    qualifiedApplications: 34,
    fundedDeals: 12,
    averageFunding: 87000
  },
  {
    id: "camp-3",
    name: "Healthcare Practices",
    platform: "LinkedIn",
    status: "paused",
    budget: 2000,
    spend: 700,
    impressions: 15000,
    clicks: 540,
    conversions: 18,
    qualifiedApplications: 8,
    fundedDeals: 4,
    averageFunding: 65000
  }
];

const withDelay = async <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 100));

export const fetchCampaigns = async (): Promise<Campaign[]> => withDelay(campaigns);

export const upsertCampaign = async (payload: Partial<Campaign> & { id?: string }): Promise<Campaign> => {
  if (payload.id) {
    campaigns = campaigns.map((camp) => (camp.id === payload.id ? { ...camp, ...payload } : camp));
    const updated = campaigns.find((camp) => camp.id === payload.id);
    if (!updated) throw new Error("Campaign not found");
    return withDelay(updated);
  }

  const created: Campaign = {
    id: `camp-${campaigns.length + 1}`,
    name: payload.name || "New campaign",
    platform: payload.platform || "Google",
    status: payload.status || "draft",
    budget: payload.budget ?? 0,
    spend: payload.spend ?? 0,
    impressions: payload.impressions ?? 0,
    clicks: payload.clicks ?? 0,
    conversions: payload.conversions ?? 0,
    qualifiedApplications: payload.qualifiedApplications ?? 0,
    fundedDeals: payload.fundedDeals ?? 0,
    averageFunding: payload.averageFunding ?? 0
  };

  campaigns = [created, ...campaigns];
  return withDelay(created);
};
