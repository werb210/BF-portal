// BF_PORTAL_BLOCK_v596
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formatSplit, toCad } from "../currencySplit";

describe("CAD / USD split", () => {
  it("shows each currency on its own and never adds USD to CAD unconverted", () => {
    expect(formatSplit({ CAD: 1000, USD: 2500 })).toBe("CA$1,000 + US$2,500");
    expect(formatSplit({ USD: 0, CAD: 0 })).toBe("CA$0");
    expect(toCad({ CAD: 1000, USD: 100 }, 1.37)).toBe(1137);
    expect(toCad({ CAD: 1000 }, null)).toBe(1000);
    expect(toCad({ CAD: 1000, USD: 100 }, null)).toBeNull();
  });
  it("the BI Commissions page reads the real summary instead of the 'not built' notice", () => {
    const page = readFileSync("src/pages/bi/BICommissionDashboard.tsx", "utf8");
    expect(page).toContain('api<Summary>("/api/v1/bi/commissions/summary")');
    expect(page).not.toContain("Commission reporting is not built yet");
  });
});
