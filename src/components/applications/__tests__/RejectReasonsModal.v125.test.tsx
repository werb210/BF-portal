// BF_PORTAL_REJECTION_REASONS_v125
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modal = readFileSync(resolve(__dirname, "..", "RejectReasonsModal.tsx"), "utf-8");
const tab = readFileSync(resolve(__dirname, "..", "..", "..", "pages", "applications", "tabs", "LendersTab.tsx"), "utf-8");

describe("the catalogue is fetched, not hardcoded", () => {
  it("reads the reasons from the server", () => { expect(modal).toContain("/api/applications/rejection-reasons"); });
  it("does not carry its own copy of the labels", () => {
    for (const c of ["credit_score", "time_in_business", "collateral"]) expect(modal).not.toContain(`"${c}"`);
  });
  it("says so plainly when a reason has no remediation", () => { expect(modal).toContain("time only"); });
});

describe("selection", () => {
  it("is multi-select", () => { expect(modal).toContain('type="checkbox"'); expect(modal).toContain("picked.includes(r.code)"); });
  it("refuses to submit with nothing selected", () => { expect(modal).toContain("picked.length === 0"); });
  it("carries the optional note", () => { expect(modal).toContain('data-testid="reject-note"'); });
});

describe("the two modes differ where it matters", () => {
  it("warns before an application-level reject, which emails immediately", () => { expect(modal).toContain("This ends the file and sends the decline email immediately"); });
  it("tells staff a single lender pass does not email", () => { expect(modal).toContain("They are not emailed unless this is the last lender to pass"); });
});

describe("wiring in the Lenders tab", () => {
  it("the free-text pass input is gone", () => { expect(tab).not.toContain("lender-pass-input-"); expect(tab).not.toContain("reasonDraft"); });
  it("sends reasonCodes to the server", () => { expect(tab).toContain("reasonCodes: codes"); });
  it("has an application-level Reject button", () => { expect(tab).toContain('data-testid="reject-application"'); });
  it("surfaces the auto-close so staff are not surprised by a stage change", () => { expect(tab).toContain("closed"); expect(tab).toContain('data-testid="reject-closed-notice"'); });
  it("reports an email failure rather than claiming success", () => { expect(tab).toContain("the email did not send"); });
});
