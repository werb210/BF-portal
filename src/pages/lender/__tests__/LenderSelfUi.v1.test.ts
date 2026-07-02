import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const dir = join(process.cwd(), "src", "pages", "lender");
const profile = readFileSync(join(dir, "LenderProfilePage.tsx"), "utf-8");
const portal = readFileSync(join(dir, "LenderPortalPage.tsx"), "utf-8");
describe("BF lender portal UI targets the real /api/lender endpoints", () => {
  it("profile uses GET+PATCH /api/lender/me (no BI/v1)", () => {
    expect(profile).toContain("/api/lender/me");
    expect(profile).not.toContain("/api/v1/bi/lender");
  });
  it("products uses GET/POST/PATCH /api/lender/products", () => {
    expect(portal).toContain("/api/lender/products");
    expect(portal).toContain('method: isEdit ? "PATCH" : "POST"');
    expect(portal).not.toContain("/api/v1/bi/lender");
  });
});
