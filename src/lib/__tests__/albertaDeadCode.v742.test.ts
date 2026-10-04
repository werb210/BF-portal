// BF_PORTAL_ALBERTA_TIME_v742 + BF_PORTAL_DEAD_DASHBOARD_v742
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { buildStampLabel } from "../buildInfo";

describe("portal cleanup", () => {
  it("shows the build time in Alberta time, UTC-6 all year", () => {
    expect(readFileSync("src/lib/buildInfo.ts", "utf8")).not.toContain("America/Edmonton");
    expect(buildStampLabel("abc1234", "2026-12-07T15:00:00Z")).toContain("9:00");
  });
  it("the old dashboard page and its unused panels are gone", () => {
    expect(existsSync("src/pages/dashboard/Dashboard.tsx")).toBe(false);
    expect(existsSync("src/components/dashboard")).toBe(false);
    expect(existsSync("src/pages/dashboard/DashboardHome.tsx")).toBe(true);
  });
});
