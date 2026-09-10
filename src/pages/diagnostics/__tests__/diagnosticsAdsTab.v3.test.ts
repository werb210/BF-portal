// BF_PORTAL_DIAGNOSTICS_ADS_TAB_v3
// This panel was filed in the left nav twice and never appeared where anyone
// would look for it. It reports ad spend that converted nothing, so it belongs
// beside the other ad reports.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sidebar = readFileSync(resolve(__dirname, "..", "..", "..", "components", "layout", "Sidebar.tsx"), "utf-8");
const app = readFileSync(resolve(__dirname, "..", "..", "..", "App.tsx"), "utf-8");

const adsComponent = readFileSync(
  resolve(__dirname, "..", "..", "marketing", "MarketingDashboard.tsx"),
  "utf-8",
);

describe("BF_PORTAL_DIAGNOSTICS_ADS_TAB_v3", () => {
  it("sits with the other ad reports", () => {
    expect(adsComponent).toContain("Ad Waste");
    expect(adsComponent).toContain("DiagnosticsPanel");
  });

  it("is not in the left nav", () => {
    expect(sidebar).not.toContain('path: "/diagnostics"');
  });

  it("has no standalone route competing with the tab", () => {
    expect(app).not.toContain('path="/diagnostics"');
  });
});
