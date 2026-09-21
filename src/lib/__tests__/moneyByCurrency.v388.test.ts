// BF_PORTAL_REPORT_CURRENCY_v388
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moneyInline, moneyLines, moneyParts } from "../moneyByCurrency";

describe("money by currency", () => {
  it("keeps CAD and USD apart, CAD first, rounded", () => {
    expect(moneyParts({ USD: 20000, CAD: 151320.4 })).toEqual(["CA$151,320", "US$20,000"]);
    expect(moneyLines({ CAD: 1, USD: 2 })).toBe("CA$1\nUS$2");
    expect(moneyInline({ CAD: 1, USD: 2 })).toBe("CA$1 / US$2");
  });
  it("drops zero amounts and returns null when there is nothing", () => {
    expect(moneyLines({ CAD: 0, USD: 50000 })).toBe("US$50,000");
    expect(moneyLines({})).toBeNull();
    expect(moneyInline(undefined)).toBeNull();
  });
});

describe("reports use it", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  it("Reports page commission figures are split by currency", () => {
    const src = read("src/pages/reports/ReportsPage.tsx");
    expect(src).toContain("moneyLines(m.commissionEarnedByCurrency) ?? money(m.commissionEarned)");
    expect(src).toContain("moneyLines(m.commissionByStageCurrency?.[stage]) ?? money(amt)");
  });
  it("funding by product shows counts, not dollars", () => {
    const src = read("src/pages/reports/ReportsPage.tsx");
    expect(src).toContain("{Number(r.funded) || 0} of {Number(r.total) || 0}");
    expect(src).not.toContain("money(r.funded ?? r.total)");
  });
  it("marketing performance revenue is split by currency", () => {
    expect(read("src/pages/dashboard/DashboardAnalytics.tsx")).toContain("moneyInline(r.revenueByCurrency) ?? `$${fmt(r.revenue ?? r.value)}`");
  });
});
