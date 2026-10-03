// BF_PORTAL_REPORTS_SECTION_v714
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("Reports wiring", () => {
  it("Reports is in the sidebar for every staff role and the Dashboard shows My reports", () => {
    const nav = readFileSync("src/layouts/AppLayout.tsx", "utf8");
    expect(nav).toContain('{ label: "Reports",        path: "/reports",         roles: ["Admin", "Staff", "Ops", "Marketing"] }');
    expect(readFileSync("src/pages/dashboard/DashboardPage.tsx", "utf8")).toContain('<ReportsBoard mode="dashboard" />');
  });
});
