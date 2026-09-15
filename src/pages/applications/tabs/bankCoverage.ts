// BF_PORTAL_BANK_COVERAGE_v268
// Reads BF-Server v267's bankCoverage from the application payload. An older
// server sends none, so no banner appears.
export type BankCoverage = {
  requiredMonths: number;
  missingMonths: string[];
  undatedStatements: number;
  statements: number;
  summary: string;
};

export function parseBankCoverage(raw: unknown): BankCoverage | null {
  const c = (raw as { bankCoverage?: unknown } | null)?.bankCoverage as Partial<BankCoverage> | null | undefined;
  if (!c || typeof c.summary !== "string" || !Array.isArray(c.missingMonths)) return null;
  return {
    requiredMonths: Number(c.requiredMonths ?? 0),
    missingMonths: c.missingMonths.map(String),
    undatedStatements: Number(c.undatedStatements ?? 0),
    statements: Number(c.statements ?? 0),
    summary: c.summary,
  };
}

export type CoverageTone = "complete" | "gaps" | "unclear";

export function coverageTone(c: BankCoverage): CoverageTone {
  if (c.missingMonths.length === 0) return "complete";
  return c.undatedStatements > 0 ? "unclear" : "gaps";
}

export function coverageHint(c: BankCoverage): string | null {
  if (c.missingMonths.length === 0) return null;
  if (c.undatedStatements > 0) return "Some statements could not be dated. Add the period when accepting them (e.g. July) and the months will update.";
  return "Request the missing months from the applicant.";
}
