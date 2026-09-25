// BF_PORTAL_BLOCK_v495_LENDER_BOUNCE_SHOWN
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describeBounce } from "../sentLenderDownloads";

describe("v495 lender bounce shown", () => {
  it("describes each bounce reason in plain English", () => {
    expect(describeBounce({ lenderId: "l1", bounce: { reason: "mailbox_full", recipient: "deals@lender.com" } }))
      .toBe("\u2717 Email bounced - mailbox full (deals@lender.com). Fix the lender's submission email and send again.");
    expect(describeBounce({ lenderId: "l1", bounce: { reason: "bad_address" } })).toContain("address does not exist");
    expect(describeBounce({ lenderId: "l1", bounce: null })).toBeNull();
  });
  it("renders the red line under the Sent marker", () => {
    const tab = readFileSync(resolve(__dirname, "../LendersTab.tsx"), "utf8");
    const sent = tab.indexOf('{"\\u2713 Sent"}');
    const bounce = tab.indexOf('data-testid="lender-bounce-status"');
    expect(sent).toBeGreaterThan(-1);
    expect(bounce).toBeGreaterThan(sent);
  });
});
