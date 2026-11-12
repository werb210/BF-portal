// BF_PORTAL_v947 - warnings on statement figures that look wrong.
import { describe, expect, it } from "vitest";
import { figureWarnings } from "../StatementFigures";

const periods = ["FY2022", "FY2023", "FY2024"].map((label) => ({ label, periodEnd: null, kind: "annual" as const }));
const row = (item: string, values: (number | null)[]) => ({ item, values, derived: false, edited: values.map(() => false) });

describe("figureWarnings", () => {
  it("flags two years with the same revenue and net income, and ratios nobody would believe", () => {
    const w = figureWarnings({ periods, rows: [row("revenue", [7, 8, 8]), row("net_income", [1, 2, 2]), row("current_ratio", [1149.2, 17.6, 20]), row("dscr", [null, null, 48.43])] });
    expect(w).toHaveLength(3);
    expect(w[0]).toContain("FY2023 and FY2024 show the same revenue");
    expect(w[1]).toContain("FY2022: a current ratio of 1149.20x");
    expect(w[2]).toContain("FY2024: a DSCR of 48.43x");
  });
  it("says nothing when the figures look normal", () => {
    expect(figureWarnings({ periods, rows: [row("revenue", [7, 8, 9]), row("net_income", [1, 2, 3]), row("current_ratio", [1.2, 1.4, 1.6])] })).toEqual([]);
  });
});
