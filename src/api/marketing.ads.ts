export type AdPlatform = "Google" | "Meta" | "Twitter" | "LinkedIn";

export type AdRecord = {
  id: string;
  platform: AdPlatform;
  campaign: string;
  headline: string;
  body: string;
  image?: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  qualifiedApplications: number;
  status: "active" | "paused";
};

export type AdUpdatePayload = Partial<Omit<AdRecord, "id" | "platform" | "campaign" | "status">> & { status?: AdRecord["status"] };

export type ABTestVariant = {
  id: string;
  headline: string;
  body: string;
  image?: string;
  clicks: number;
  conversions: number;
};

export type ABTest = {
  id: string;
  adId: string;
  platform: AdPlatform;
  metric: "clicks" | "conversions";
  variants: ABTestVariant[];
};

let ads: AdRecord[] = [
  {
    id: "ad-1",
    platform: "Google",
    campaign: "SMB Loans",
    headline: "Fast funding for your business",
    body: "Apply today and get funded within 24 hours.",
    image: "/images/google-ad-1.png",
    budget: 2500,
    spend: 900,
    impressions: 21000,
    clicks: 1100,
    conversions: 54,
    qualifiedApplications: 23,
    status: "active"
  },
  {
    id: "ad-2",
    platform: "Meta",
    campaign: "Equipment Financing",
    headline: "Upgrade your equipment",
    body: "Flexible financing for new purchases.",
    budget: 1800,
    spend: 750,
    impressions: 14000,
    clicks: 620,
    conversions: 31,
    qualifiedApplications: 12,
    status: "active"
  },
  {
    id: "ad-3",
    platform: "LinkedIn",
    campaign: "Healthcare Practices",
    headline: "Funding for healthcare clinics",
    body: "Meet payroll, expand locations, or refinance debt.",
    budget: 1200,
    spend: 400,
    impressions: 7200,
    clicks: 260,
    conversions: 11,
    qualifiedApplications: 6,
    status: "paused"
  }
];

let abTests: ABTest[] = [
  {
    id: "ab-1",
    adId: "ad-1",
    platform: "Google",
    metric: "conversions",
    variants: [
      {
        id: "ab-1-a",
        headline: "Fast funding for your business",
        body: "Apply today and get funded within 24 hours.",
        image: "/images/google-ad-1a.png",
        clicks: 550,
        conversions: 29
      },
      {
        id: "ab-1-b",
        headline: "24-hour approvals",
        body: "Lower rates and fast approvals for SMBs.",
        image: "/images/google-ad-1b.png",
        clicks: 560,
        conversions: 25
      }
    ]
  }
];

const withDelay = async <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 120));

export const fetchAds = async (): Promise<AdRecord[]> => withDelay(ads);

export const updateAd = async (id: string, payload: AdUpdatePayload): Promise<AdRecord> => {
  ads = ads.map((ad) => (ad.id === id ? { ...ad, ...payload } : ad));
  const updated = ads.find((ad) => ad.id === id);
  if (!updated) throw new Error("Ad not found");
  return withDelay(updated);
};

export const createAd = async (payload: Omit<AdRecord, "id" | "spend" | "impressions" | "clicks" | "conversions" | "qualifiedApplications" | "status">): Promise<AdRecord> => {
  const newAd: AdRecord = {
    id: `ad-${ads.length + 1}`,
    status: "active",
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    qualifiedApplications: 0,
    ...payload
  };
  ads = [newAd, ...ads];
  return withDelay(newAd);
};

export const toggleAdStatus = async (id: string): Promise<AdRecord> => {
  const ad = ads.find((item) => item.id === id);
  if (!ad) throw new Error("Ad not found");
  const updated: AdRecord = { ...ad, status: ad.status === "active" ? "paused" : "active" };
  ads = ads.map((item) => (item.id === id ? updated : item));
  return withDelay(updated);
};

export const fetchABTests = async (): Promise<ABTest[]> => withDelay(abTests);

export const createABTest = async (test: Omit<ABTest, "id">): Promise<ABTest> => {
  const created: ABTest = { ...test, id: `ab-${abTests.length + 1}` };
  abTests = [created, ...abTests];
  return withDelay(created);
};
