// BF_PORTAL_SBA_SIGN_AGAIN_v775
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const src = readFileSync("src/pages/applications/tabs/ApplicationTab.tsx", "utf8");
describe("Sign again on a signed SBA file", () => {
  it("shows only on SBA files that are signed or out for signing", () => {
    expect(src).toContain('v_sign?.isSba && (v_sign.reason === "signed" || v_sign.reason === "started")');
    expect(src).toContain('data-testid="sign-again"');
  });
  it("asks first, then sends again: true", () => {
    expect(src).toContain("window.confirm(");
    expect(src).toContain("again ? { again: true } : {}");
  });
});
