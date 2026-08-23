// BF_PORTAL_LENDER_OTP_RESTYLE_v1 - the lender login/OTP pages are phone-OTP,
// styled like the staff portal (navy/white/amber, real logo), auto-forward on
// both fields, and verify with userType:"lender".
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const login = readFileSync(join(process.cwd(), "src", "lender", "auth", "LenderLoginPage.tsx"), "utf-8");
const otp = readFileSync(join(process.cwd(), "src", "lender", "auth", "LenderOtpPage.tsx"), "utf-8");
const css = readFileSync(join(process.cwd(), "src", "styles", "lender.css"), "utf-8");
describe("lender portal restyle", () => {
  it("login is phone-based, staff-styled, auto-forwarding", () => {
    expect(login).toContain("/api/auth/otp/start");
    expect(login).toContain('bg-[#020817]');
    expect(login).toContain("logo-boreal-mountains-white");
    expect(login).toContain("autoFiredFor"); // phone auto-forward
    expect(login).not.toContain("password");
  });
  it("otp header is Boreal Financial Group / Lender Portal, auto-forwards, verifies as lender", () => {
    expect(otp).toContain("Boreal Financial Group");
    expect(otp).toContain("Lender Portal");
    expect(otp).toContain('userType: "lender"');
    expect(otp).toContain("code.length !== 6"); // 6-digit auto-forward guard
    expect(otp).toContain("lender-portal.auth"); // persists session for the guard
  });
  it("inner shell restyled to BF-silo tokens", () => {
    expect(css).toContain("var(--ui-surface-strong");
    // BF_PORTAL_OTP_TEST_v43 - v41 moved this from #020817 to the brand deep
    // navy. Same guarantee: the lender shell keeps a dark sidebar.
    expect(css).toContain("#081729"); // dark sidebar like staff
    expect(css).not.toContain("#020817");
  });
});
