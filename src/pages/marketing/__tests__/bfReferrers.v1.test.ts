// BF_PORTAL_BF_REFERRER_MANAGEMENT_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const comp = readFileSync(path.join(process.cwd(),"src/pages/marketing/BFReferrerManagement.tsx"),"utf8");
const dash = readFileSync(path.join(process.cwd(),"src/pages/marketing/MarketingDashboard.tsx"),"utf8");
describe("BF Referrer Management (v1)", () => {
  it("uses BF endpoints, not BI", () => {
    expect(comp).toContain('"/api/admin/referrers"');
    expect(comp).not.toContain("/api/v1/bi/admin/referrers");
  });
  it("is added as a Referrers tab in Marketing", () => {
    expect(dash).toContain('{ id: "referrers", label: "Referrers" }');
    // BF_PORTAL_PARTNERS_TABS_v720 - now inside the Referrers / Brokers sub-tabs.
    expect(dash).toContain("<ReferrersAndBrokers");
  });
});
