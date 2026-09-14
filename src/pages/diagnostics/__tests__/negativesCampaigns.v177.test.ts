// BF_PORTAL_NEGATIVES_CAMPAIGN_PICKER_v177
import { describe, expect, it } from "vitest";
import { unwrapCampaigns, campaignLabel } from "../negativesCampaigns";

describe("unwrapCampaigns", () => {
  it("reads the bare shape", () => {
    expect(unwrapCampaigns({ campaigns: [{ id: "1", name: "BF Search", status: "ENABLED" }] }))
      .toHaveLength(1);
  });

  it("reads the enveloped shape", () => {
    expect(unwrapCampaigns({ data: { campaigns: [{ id: "1", name: "BF Search", status: "ENABLED" }] } }))
      .toHaveLength(1);
  });

  it("reads a bare array", () => {
    expect(unwrapCampaigns([{ id: "1", name: "BF Search", status: "ENABLED" }])).toHaveLength(1);
  });

  it("drops entries with no id so the select never renders an unusable option", () => {
    expect(unwrapCampaigns({ campaigns: [{ id: "", name: "x", status: "ENABLED" }] })).toHaveLength(0);
  });

  it("is safe on null and on an unexpected shape", () => {
    expect(unwrapCampaigns(null)).toEqual([]);
    expect(unwrapCampaigns({} as never)).toEqual([]);
  });
});

describe("campaignLabel", () => {
  it("flags paused campaigns, which is the current state of BF Search US", () => {
    expect(campaignLabel({ id: "1", name: "BF Search", status: "PAUSED" })).toBe("BF Search (paused)");
    expect(campaignLabel({ id: "1", name: "BF Search", status: "ENABLED" })).toBe("BF Search");
  });
});
