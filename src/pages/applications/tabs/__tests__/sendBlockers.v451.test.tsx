// BF_PORTAL_SEND_BLOCKERS_v451
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const src = readFileSync(
  path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"), "utf8");

describe("v451 a refused lender send says why", () => {
  it("maps every blocker BF-Server can return", () => {
    for (const code of [
      "required_documents_not_accepted",
      "open_tasks_remaining",
      "collateral_not_complete",
      "credit_summary_not_submitted",
      "application_not_signed",
      "product_questions_incomplete",
    ]) {
      expect(src).toContain(code);
    }
  });

  it("reads the blocker list off the response body", () => {
    expect(src).toContain("body?.blockers ?? body?.reasons");
  });

  it("falls back to the error code, then the message, then a plain sentence", () => {
    expect(src).toContain("gave no reason");
  });

  it("treats a send that reached nobody as a failure", () => {
    expect(src).toContain("did not send to any lender");
  });

  it("the catch uses the describer, not the bare message", () => {
    expect(src).toContain("setSendError(describeSendFailure(err))");
    expect(src).not.toContain('setSendError(getErrorMessage(err, "Unable to send to lenders."))');
  });

  it("sendError is actually rendered somewhere", () => {
    // If this fails, the state was being set and never shown - which is the
    // whole reason the operator saw nothing.
    expect(src).toMatch(/\{sendError[\s\S]{0,120}\}/);
  });
});
