// BF_PORTAL_BI_COMMISSIONS_HONEST_EMPTY_v1
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dash = readFileSync(path.join(process.cwd(), "src/pages/bi/BICommissionDashboard.tsx"), "utf8");
const exists = (p: string) => existsSync(path.join(process.cwd(), p));

describe("the commissions page tells the truth", () => {
  it("no longer calls an endpoint bi-server does not implement", () => {
    expect(dash).not.toContain("/bi/admin/commissions");
    expect(dash).not.toContain("useQuery");
  });
  it("says it is not built instead of rendering an empty report", () => {
    expect(dash).toContain("Commission reporting is not built yet");
  });
  it("still respects the silo guard", () => {
    expect(dash).toContain('if (silo !== "bi") return null;');
  });
});

describe("dead BI pages are gone", () => {
  it("removes the lender products page - BI lenders send applications, they have no products", () => {
    expect(exists("src/silos/bi/lender/BILenderProducts.tsx")).toBe(false);
  });
  it("removes the unmounted duplicate commission report", () => {
    expect(exists("src/silos/bi/reports/CommissionReport.tsx")).toBe(false);
  });
});
