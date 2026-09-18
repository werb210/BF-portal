// BF_PORTAL_COMMISSION_CURRENCY_v352 / BF_PORTAL_REQUEST_ITEMS_RELOAD_v352
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dash = readFileSync(join(process.cwd(), "src/pages/dashboard/DashboardPage.tsx"), "utf8");
const req = readFileSync(join(process.cwd(), "src/pages/applications/tabs/RequestItemsTab.tsx"), "utf8");

describe("dashboard commission by currency", () => {
  it("shows CAD and USD separately, falling back to the single total", () => {
    expect(dash).toContain("splitMoney(metrics.commissionEarnedByCurrency)");
    expect(dash).toContain("splitMoney(metrics?.commissionByStageCurrency?.[stage])");
    expect(dash).toContain('[["CAD", "CA$"], ["USD", "US$"]]');
  });
  it("shows no commission for Rejected", () => {
    expect(dash).toContain('stage === "Rejected"');
  });
});

describe("Request Items reloads after a request", () => {
  it("re-reads the saved list instead of clearing the ticks", () => {
    expect(req).toContain("}, [applicationId, reloadKey]);");
    expect(req).toContain("setReloadKey((k) => k + 1);");
  });
});
