// BF_PORTAL_BLOCK_v488_MARK_SENT_FEEDBACK
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tab = readFileSync(resolve(__dirname, "../LendersTab.tsx"), "utf8");

describe("v488 Mark as sent feedback", () => {
  it("pops up success and failure", () => {
    expect(tab).toContain('import toast from "react-hot-toast"');
    expect(tab).toContain("toast.success(`Recorded as sent to ${v.lenderName}. Moved to Off to Lender.`)");
    expect(tab).toContain("toast.error(`Mark as sent failed: ${msg}`)");
  });
});
