// LENDER_PORTAL_ONE_PAGE_v1 - the lender portal is ONE page (profile + products
// + uploads) reusing the staff product form fields. No deals page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const portal = readFileSync(join(process.cwd(), "src", "pages", "lender", "LenderPortalPage.tsx"), "utf-8");
const app = readFileSync(join(process.cwd(), "src", "App.tsx"), "utf-8");
describe("BF lender portal one-page UI", () => {
  it("targets the real /api/lender endpoints (me, products, uploads)", () => {
    expect(portal).toContain("/api/lender/me");
    expect(portal).toContain("/api/lender/products");
    expect(portal).toContain("/api/lender/uploads");
    expect(portal).toContain('method: isEdit ? "PATCH" : "POST"');
    expect(portal).not.toContain("/api/v1/bi/lender");
  });
  it("reuses the shared staff product form fields, not a bare copy", () => {
    expect(portal).toContain("ProductCoreFields");
    expect(portal).toContain("CATEGORY_LONG_TO_SHORT");
  });
  it("has no deals route; legacy lender-portal paths redirect to the one page", () => {
    expect(app).toContain('<Route path="/lender-portal" element={<LenderPortalPage />} />');
    expect(app).not.toContain('element={<LenderProfilePage');
    expect(app).not.toContain('"/lender-portal/deals" element={<LenderPortalPage');
  });
});
