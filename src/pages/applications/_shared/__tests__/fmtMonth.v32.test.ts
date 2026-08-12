// BF_PORTAL_TREND_MONTH_v32
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fmtMonth } from "../fmtMonth";

describe("fmtMonth", () => {
  it("labels a month_start with its own month, not the one before", () => {
    expect(fmtMonth("2026-02-01")).toBe("Feb 26");
    expect(fmtMonth("2026-07-01")).toBe("Jul 26");
  });

  it("leaves an unparseable value alone", () => {
    expect(fmtMonth("not a date")).toBe("not a date");
  });
});

describe("no second copy of the month formatter", () => {
  it("the trend chart imports the shared one instead of defining its own", () => {
    const src = readFileSync(
      "src/pages/applications/_shared/BankingTrendChart.tsx",
      "utf8",
    );
    expect(src).not.toContain("function fmtMonth");
    expect(src).toContain('from "./fmtMonth"');
  });

  it("the tab does not define its own either", () => {
    const src = readFileSync(
      "src/pages/applications/tabs/BankingAnalysisTab.tsx",
      "utf8",
    );
    expect(src).not.toContain("function fmtMonth");
  });
});
