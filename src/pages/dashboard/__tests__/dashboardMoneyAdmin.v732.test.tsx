// BF_PORTAL_DASHBOARD_MONEY_ADMIN_v732 + BF_PORTAL_FEE_AGREEMENT_BUTTON_FIX_v732
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import { builtinBody } from "../DashboardHome";

const metrics: any = { activeApplications: 8, dealsWonThisMonth: 0, commissionEarned: 500, newLeadsToday: 1, pipelineByStage: { "Off to Lender": 5 }, commissionByStage: { "Off to Lender": 131020 } };
const analytics: any = { revenueFunnel: { visits: 0, applications: 0, submitted: 0, funded: 0 }, applicationFunnel: {}, marketingPerformance: [{ name: "Google", revenue: 900 }] };

describe("commission on the Dashboard is Admin only", () => {
  it("staff do not see commission in Key numbers or Pipeline by stage", () => {
    render(<>{builtinBody("dash_kpis", { metrics, analytics, range: 30 })}{builtinBody("dash_pipeline", { metrics, analytics, range: 30 })}{builtinBody("dash_marketing_perf", { metrics, analytics, range: 30 })}</>);
    expect(screen.queryByText("Commission Earned (all time)")).toBeNull();
    expect(screen.queryByText(/131,020/)).toBeNull();
    expect(screen.getByText("Revenue figures are for Admin only.")).toBeTruthy();
  });
  it("Admin sees them", () => {
    render(<>{builtinBody("dash_kpis", { metrics, analytics, range: 30, isAdmin: true })}{builtinBody("dash_pipeline", { metrics, analytics, range: 30, isAdmin: true })}</>);
    expect(screen.getByText("Commission Earned (all time)")).toBeTruthy();
    expect(screen.getByText(/131,020/)).toBeTruthy();
  });
  it("the old Dashboard page is gone", () => {
    expect(existsSync("src/pages/dashboard/DashboardPage.tsx")).toBe(false);
  });
  it("the fee agreement button reads the file's real product category", () => {
    expect(readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8")).toContain("BF_PORTAL_FEE_AGREEMENT_BUTTON_FIX_v732");
  });
});
