// BF_PORTAL_BLOCK_v621_ALL_ADS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { unwrapClicks } from "../ClicksPanel";

describe("Clicks tab lists every ad", () => {
  it("keeps the server's warning when Google could not list the ads", () => {
    expect(unwrapClicks({ total: 0, campaigns: [], adsListError: "Google Ads did not answer" }).adsListError).toBe("Google Ads did not answer");
    expect(unwrapClicks({ total: 0, campaigns: [] }).adsListError).toBeFalsy();
  });
  it("shows the warning and greys out ads with no clicks", () => {
    const src = readFileSync("src/pages/diagnostics/ClicksPanel.tsx", "utf8");
    expect(src).toContain('data-testid="ad-clicks-list-warning"');
    expect(src).toContain("a.clicks === 0");
  });
});
