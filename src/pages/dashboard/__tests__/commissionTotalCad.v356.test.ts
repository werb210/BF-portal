// BF_PORTAL_COMMISSION_TOTAL_CAD_v356
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dash = readFileSync(join(process.cwd(), "src/pages/dashboard/DashboardPage.tsx"), "utf8");
const analytics = readFileSync(join(process.cwd(), "src/pages/dashboard/DashboardAnalytics.tsx"), "utf8");

describe("pipeline commission card", () => {
  it("has no Rejected row", () => {
    expect(dash).toContain('.filter(([stage]) => stage !== "Rejected")');
  });
  it("totals the rows in CAD and shows the rate used", () => {
    expect(dash).toContain("Total (CAD)");
    expect(dash).toContain("metrics?.commissionByStage?.[stage] ?? 0");
    expect(dash).toContain("US$1 = CA$${metrics.fx.usdToCad.toFixed(4)} · Bank of Canada");
  });
  it("labels the lower funnel as a time window", () => {
    expect(analytics).toContain("Applications created in the last {range} days, by current stage.");
  });
});
