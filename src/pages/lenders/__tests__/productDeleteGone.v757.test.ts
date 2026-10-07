// BF_PORTAL_PRODUCT_DELETE_GONE_v757
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const lenders = readFileSync("src/pages/lenders/LendersPage.tsx", "utf8");
const products = readFileSync("src/pages/lenders/LenderProductsPage.tsx", "utf8");

describe("deleting a product that is already gone", () => {
  it("treats a 404 as deleted in both product editors", () => {
    for (const src of [lenders, products]) {
      expect(src).toContain("BF_PORTAL_PRODUCT_DELETE_GONE_v757");
      expect(src).toMatch(/status\?: number \}\)\?\.status === 404\)/);
    }
  });
  it("refreshes products after a lender is deleted (its products go with it)", () => {
    const i = lenders.indexOf("await api.delete(`/api/portal/lenders/${lender.id}`);");
    const j = lenders.indexOf('queryKey: ["lender-products"]', i);
    expect(i).toBeGreaterThan(0);
    expect(j - i).toBeLessThan(400);
  });
});
