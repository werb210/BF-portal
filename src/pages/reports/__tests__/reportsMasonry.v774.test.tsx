// BF_PORTAL_REPORTS_MASONRY_v774
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { masonrySpan, MASONRY_GRID } from "../ReportsBoard";

describe("report cards fill the space under shorter cards", () => {
  it("packs densely on small rows instead of lining cards up in rows", () => {
    expect(MASONRY_GRID.gridAutoFlow).toBe("row dense");
    expect(MASONRY_GRID.gridAutoRows).toBe("4px");
    expect(MASONRY_GRID.rowGap).toBe(0);
  });
  it("a card spans rows for its height plus the 12 px gap", () => {
    expect(masonrySpan(100)).toBe(28); // (100 + 12) / 4
    expect(masonrySpan(0)).toBe(3);
  });
  it("every card on the board sits in a measured cell; wide cards still span the full width", () => {
    const src = readFileSync("src/pages/reports/ReportsBoard.tsx", "utf8");
    expect(src).toContain('<MasonryCell key={card.id} full={card.size === "full"}>');
    expect(src).toContain('gridColumn: full ? "1 / -1" : "auto", gridRowEnd: `span ${span}`');
  });
});
