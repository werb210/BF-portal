// BF_PORTAL_BANK_COVERAGE_v268
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { coverageHint, coverageTone, parseBankCoverage } from "../bankCoverage";

const complete = { bankCoverage: { requiredMonths: 6, missingMonths: [], undatedStatements: 0, statements: 9, summary: "Jan 2026 – Aug 2026 · Sep 2026 (partial) · 6 of 6 months · no gaps" } };

describe("bank statement coverage banner", () => {
  it("reads the server summary", () => {
    expect(parseBankCoverage(complete)?.summary).toContain("6 of 6 months");
    expect(parseBankCoverage({ documents: [] })).toBeNull();
    expect(parseBankCoverage(null)).toBeNull();
  });
  it("green when complete, red for real gaps, amber when undated statements may fill them", () => {
    const c = parseBankCoverage(complete)!;
    expect(coverageTone(c)).toBe("complete");
    expect(coverageHint(c)).toBeNull();
    const gaps = { ...c, missingMonths: ["2026-05"] };
    expect(coverageTone(gaps)).toBe("gaps");
    expect(coverageHint(gaps)).toBe("Request the missing months from the applicant.");
    const unclear = { ...gaps, undatedStatements: 2 };
    expect(coverageTone(unclear)).toBe("unclear");
    expect(coverageHint(unclear)).toContain("Add the period when accepting");
  });
  it("is shown on the Documents tab", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
    expect(tab).toContain('data-testid="bank-coverage-banner"');
    expect(tab).toContain("setBankCoverage(parseBankCoverage(r))");
  });
});
