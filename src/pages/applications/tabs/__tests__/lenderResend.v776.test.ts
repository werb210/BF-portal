// BF_PORTAL_LENDER_RESEND_v776
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const src = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8");
describe("Resend on the Lenders tab", () => {
  it("sent lenders get a Resend button next to Record pass", () => {
    const at = src.indexOf('"Edit pass reasons" : "Record pass"');
    expect(src.indexOf("data-testid={`lender-resend-${m.id}`}")).toBeGreaterThan(at);
  });
  it("asks first, then calls the resend route for that lender", () => {
    expect(src).toContain("window.confirm(`Send the current package to ${lenderName} again?`)");
    expect(src).toContain("/lenders/${encodeURIComponent(lenderId)}/resend");
  });
  it("explains why a resend did not go out", () => {
    expect(src).toContain("not_sent_before:");
    expect(src).toContain("RESEND_REASONS[reason] ?? SEND_REASONS[reason]");
  });
});
