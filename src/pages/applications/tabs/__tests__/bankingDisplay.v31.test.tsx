// BF_PORTAL_BANKING_DISPLAY_v31
import { describe, it, expect } from "vitest";
import { fmtMonth } from "../BankingAnalysisTab";

describe("fmtMonth", () => {
  it("labels a month_start with its own month, not the one before", () => {
    // new Date("2026-03-01") is UTC midnight; west of Greenwich that renders as
    // Feb 28, which shifted every label on this tab one month early.
    expect(fmtMonth("2026-03-01")).toBe("Mar 26");
    expect(fmtMonth("2026-01-01")).toBe("Jan 26");
    expect(fmtMonth("2026-07-01")).toBe("Jul 26");
  });

  it("handles a full timestamp and leaves junk alone", () => {
    expect(fmtMonth("2026-12-01T00:00:00Z")).toBe("Dec 26");
    expect(fmtMonth("not a date")).toBe("not a date");
  });
});
