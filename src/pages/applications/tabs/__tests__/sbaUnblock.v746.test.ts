// BF_PORTAL_CREDIT_SUMMARY_READABLE_v746 / BF_PORTAL_SEND_REASON_v746 / BF_PORTAL_BANK_TOO_OLD_v746
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { coverageHint } from "../bankCoverage";

describe("bank statements that are too old", () => {
  it("says they are too old and names the months to ask for", () => {
    expect(coverageHint({ requiredMonths: 6, missingMonths: ["Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"], undatedStatements: 0, statements: 6, summary: "" }))
      .toBe("The uploaded statements are older than the most recent 6 months lenders need. Ask the applicant for Apr 2026 to Sep 2026.");
  });
  it("keeps the usual hint for a partial gap", () => {
    expect(coverageHint({ requiredMonths: 6, missingMonths: ["Sep 2026"], undatedStatements: 0, statements: 5, summary: "" })).toBe("Request the missing months from the applicant.");
  });
});

describe("credit summary is readable", () => {
  it("cards and buttons carry their own text colours", () => {
    const s = readFileSync("src/pages/applications/_shared/CreditSummaryV2.tsx", "utf8");
    expect(s).toContain('background: "#fff", color: "#0f172a"');
    expect(s).toContain('background: "#0B1F3A", color: "#ffffff"');
  });
});

describe("send says what is missing", () => {
  it("has messages for an unsigned application and an unsubmitted credit summary", () => {
    const s = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8");
    expect(s).toContain("application_not_signed:");
    expect(s).toContain("credit_summary_not_submitted:");
  });
});
