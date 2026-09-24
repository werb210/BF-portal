// BF_PORTAL_BLOCK_v483_MARK_SENT_TO_LENDER
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tab = readFileSync(resolve(__dirname, "../LendersTab.tsx"), "utf8");

describe("v483 Mark as sent", () => {
  it("posts to the mark-sent route for one lender", () => {
    expect(tab).toContain("/lenders/${encodeURIComponent(v.lenderId)}/mark-sent");
  });
  it("offers the button only on lenders not already sent, after a confirm", () => {
    expect(tab).toContain("{lenderKey && !isSent && (");
    expect(tab).toContain("window.confirm(`Record that you sent this file to ${name} outside the portal?");
  });
  it("labels hand-recorded sends", () => {
    expect(tab).toContain('" outside portal"');
    expect(tab).toContain("x.manual");
  });
});
