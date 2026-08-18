// BF_PORTAL_LENDER_PORTAL_RESTYLE_v1 - the real lender login (/lender-portal/
// login) is staff-styled phone-OTP with auto-format + auto-forward on both
// fields, header "Boreal Financial" / "Lender Portal", logic unchanged.
// BF_PORTAL_BRAND_v38 - now pins the brand navy and the public wordmark.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "pages", "lender", "LenderLoginPage.tsx"), "utf-8");
describe("lender portal login restyle (real page)", () => {
  it("is staff-styled with the Boreal Financial / Lender Portal header", () => {
    expect(src).toContain("bg-[#0B1F3A]");
    expect(src).toContain("Boreal Financial");
    expect(src).toContain("Lender Portal");
    expect(src).toContain("logo-boreal-mountains-white");
  });
  it("auto-forwards phone and code", () => {
    expect(src).toContain("autoSentFor");
    expect(src).toContain("autoVerifiedFor");
    expect(src).toContain("code.length !== 6");
  });
  it("keeps the phone-OTP lender auth logic", () => {
    expect(src).toContain('userType: "lender"');
    expect(src).toContain('sessionStorage.setItem("lender_token"');
    expect(src).toContain('navigate("/lender-portal")');
  });
});
