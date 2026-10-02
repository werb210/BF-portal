// BF_PORTAL_BLOCK_v615_AD_CLICKS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { unwrapClicks } from "../ClicksPanel";

describe("Marketing > Ads > Clicks", () => {
  it("reads the tree with or without a data envelope", () => {
    const tree = { total: 3, campaigns: [{ campaign: "BF Search - US", clicks: 3, adGroups: [] }] };
    expect(unwrapClicks(tree)).toEqual(tree);
    expect(unwrapClicks({ data: tree })).toEqual(tree);
    expect(unwrapClicks(null)).toEqual({ total: 0, campaigns: [] });
  });

  it("is the tab to the right of Negatives and calls the CRM clicks endpoint", () => {
    const dash = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
    expect(dash).toContain("<VisitorsPanel /><ClicksPanel />");
    expect(readFileSync("src/pages/diagnostics/ClicksPanel.tsx", "utf8")).toContain('"/api/marketing/ad-clicks"');
  });
});
