import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
const profile = readFileSync(fileURLToPath(new URL("../LenderProfilePage.tsx", import.meta.url)), "utf-8");
const portal = readFileSync(fileURLToPath(new URL("../LenderPortalPage.tsx", import.meta.url)), "utf-8");
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
