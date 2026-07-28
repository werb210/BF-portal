import { describe, expect, it } from "vitest";
import { normalizeAnalyticsResponse } from "../DashboardAnalytics";

const serverData = {
  days: 30,
  acquisition: [{ name: "Organic", applications: 12 }],
  marketing: [{ name: "Email", revenue: 4500 }],
  funding: [{ name: "LOC", funded: 8 }],
  documents: [{ name: "Bank statement", issueRate: 4 }],
  lenders: [{ name: "Lender A", approvalRate: 82 }],
};

describe("dashboard analytics response normalization", () => {
  it("unwraps the server envelope and maps server aliases", () => {
    const result = normalizeAnalyticsResponse({ status: "ok", data: serverData });

    expect(result.acquisitionChannels).toEqual(serverData.acquisition);
    expect(result.marketingPerformance).toEqual(serverData.marketing);
    expect(result.fundingByProduct).toEqual(serverData.funding);
    expect(result.documentUploadIssues).toEqual(serverData.documents);
    expect(result.topLendersByApprovalRate).toEqual(serverData.lenders);
  });

  it("accepts an unwrapped response using canonical names", () => {
    const canonical = {
      acquisitionChannels: serverData.acquisition,
      marketingPerformance: serverData.marketing,
      fundingByProduct: serverData.funding,
      documentUploadIssues: serverData.documents,
      topLendersByApprovalRate: serverData.lenders,
    };

    expect(normalizeAnalyticsResponse(canonical)).toMatchObject(canonical);
  });

  it("falls back safely for malformed responses", () => {
    const result = normalizeAnalyticsResponse({ status: "ok", data: "invalid" });

    expect(result.revenueFunnel).toEqual({ visits: 0, applications: 0, submitted: 0, funded: 0 });
    expect(result.acquisitionChannels).toEqual([]);
    expect(result.topLendersByApprovalRate).toEqual([]);
  });
});
