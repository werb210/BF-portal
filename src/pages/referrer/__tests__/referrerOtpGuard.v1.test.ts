// BF_PORTAL_REFERRER_OTP_GUARD_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const s = readFileSync(path.join(process.cwd(), "src/pages/referrer/ReferrerLoginPage.tsx"), "utf8");
describe("referrer otp guard", () => {
  it("redirects a signed-in referrer away from the OTP login", () => {
    expect(s).toContain('if (sessionStorage.getItem("referrer_token")) navigate("/referrer"');
  });
  it("does not auto-send OTP when already signed in", () => {
    expect(s).toContain('if (sessionStorage.getItem("referrer_token")) return; // BF_PORTAL_REFERRER_OTP_GUARD_v1');
  });
});
