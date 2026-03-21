export type ChannelAttribution = {
  channel: string;
  leads: number;
  qualifiedApplications: number;
  fundedDeals: number;
  spend: number;
  costPerLead: number;
  costPerQualifiedApp: number;
  costPerFundedDeal: number;
  averageFunding: number;
  funnelConversion: number;
  lenderPreference: string;
};

export type AttributionDashboard = {
  dateRange: string;
  channels: ChannelAttribution[];
  distribution: { channel: string; value: number }[];
};

const dashboard: AttributionDashboard = {
  dateRange: "Last 30 days",
  channels: [
    {
      channel: "Google Ads",
      leads: 1800,
      qualifiedApplications: 820,
      fundedDeals: 210,
      spend: 32000,
      costPerLead: 17.7,
      costPerQualifiedApp: 39.02,
      costPerFundedDeal: 152.3,
      averageFunding: 115000,
      funnelConversion: 0.12,
      lenderPreference: "Premier Lender"
    },
    {
      channel: "Meta Ads",
      leads: 1200,
      qualifiedApplications: 430,
      fundedDeals: 90,
      spend: 18000,
      costPerLead: 15,
      costPerQualifiedApp: 41.86,
      costPerFundedDeal: 200,
      averageFunding: 83000,
      funnelConversion: 0.09,
      lenderPreference: "Fast Capital"
    },
    {
      channel: "Twitter Ads",
      leads: 520,
      qualifiedApplications: 160,
      fundedDeals: 30,
      spend: 7000,
      costPerLead: 13.46,
      costPerQualifiedApp: 43.75,
      costPerFundedDeal: 233.3,
      averageFunding: 76000,
      funnelConversion: 0.06,
      lenderPreference: "Growth Bank"
    },
    {
      channel: "LinkedIn Ads",
      leads: 640,
      qualifiedApplications: 220,
      fundedDeals: 62,
      spend: 9000,
      costPerLead: 14.06,
      costPerQualifiedApp: 40.9,
      costPerFundedDeal: 145.16,
      averageFunding: 140000,
      funnelConversion: 0.1,
      lenderPreference: "Professional Finance"
    },
    {
      channel: "Organic search",
      leads: 1300,
      qualifiedApplications: 410,
      fundedDeals: 105,
      spend: 0,
      costPerLead: 0,
      costPerQualifiedApp: 0,
      costPerFundedDeal: 0,
      averageFunding: 99000,
      funnelConversion: 0.08,
      lenderPreference: "Mixed"
    },
    {
      channel: "Direct traffic",
      leads: 800,
      qualifiedApplications: 260,
      fundedDeals: 70,
      spend: 0,
      costPerLead: 0,
      costPerQualifiedApp: 0,
      costPerFundedDeal: 0,
      averageFunding: 87000,
      funnelConversion: 0.09,
      lenderPreference: "Premier Lender"
    },
    {
      channel: "Referral partners",
      leads: 360,
      qualifiedApplications: 160,
      fundedDeals: 80,
      spend: 0,
      costPerLead: 0,
      costPerQualifiedApp: 0,
      costPerFundedDeal: 0,
      averageFunding: 150000,
      funnelConversion: 0.22,
      lenderPreference: "Partner Network"
    }
  ],
  distribution: [
    { channel: "Google Ads", value: 33 },
    { channel: "Meta Ads", value: 21 },
    { channel: "Twitter Ads", value: 8 },
    { channel: "LinkedIn Ads", value: 12 },
    { channel: "Organic search", value: 15 },
    { channel: "Direct traffic", value: 7 },
    { channel: "Referral partners", value: 4 }
  ]
};

const withDelay = async <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 120));

export const fetchAttributionDashboard = async (dateRange?: string): Promise<AttributionDashboard> =>
  withDelay({ ...dashboard, dateRange: dateRange || dashboard.dateRange });
