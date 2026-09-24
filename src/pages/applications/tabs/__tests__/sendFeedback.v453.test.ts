// BF_PORTAL_BLOCK_v453_SEND_FEEDBACK
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"),
  "utf8",
);

describe("v453 lender send feedback", () => {
  it("renders send feedback in the sticky footer beside the Send button", () => {
    const footer = src.slice(src.indexOf('data-testid="lenders-send-footer"'));
    expect(footer).toContain('data-testid="lenders-send-feedback"');
    expect(footer.indexOf("sendError ?? sendSuccess")).toBeLessThan(
      footer.indexOf("onClick={handleSend}"),
    );
  });

  it("announces both successful and unsuccessful send results", () => {
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain("setSendSuccess(`Sent to ${sentCount} lender");
    expect(src).toContain("sendError ? \"#b91c1c\" : \"#166534\"");
  });

  it("clears stale success feedback when another send starts", () => {
    expect(src).toContain("setSendSuccess(null)");
  });
});
