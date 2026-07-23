// BF_PORTAL_FINDTIME_RULER_ALIGN_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/components/o365/FindATimePanel.tsx"),
  "utf8",
);

describe("free/busy ruler lines up with the availability blocks", () => {
  it("ruler and blocks share one set of geometry constants", () => {
    expect(src).toContain("const SLOT_PX = 14;");
    expect(src).toContain("const HOUR_PX = SLOTS_PER_HOUR * SLOT_PX;");
    expect(src).toContain("const LABEL_GUTTER_PX = 150;");
  });

  it("no row hardcodes its own width any more", () => {
    // Divergent literals are what let the two rows drift apart.
    expect(src).not.toContain("width: SLOTS_PER_HOUR * 14");
    expect(src).not.toContain("paddingLeft: 150");
    expect(src).not.toContain("<div style={{ width: 150, fontSize: 12");
    expect(src).not.toContain("width: 14,\n                            height: 22,");
  });

  it("sizing is border-box so a divider cannot shift a label", () => {
    const occurrences = src.split('boxSizing: "border-box"').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it("hour labels can never wrap or clip", () => {
    expect(src).toContain("function hourRulerLabel");
    expect(src).toContain('whiteSpace: "nowrap"');
    expect(src).toContain("lineHeight:");
  });

  it("compact label still exposes the full time on hover", () => {
    expect(src).toContain("title={slotTimeLabel((GRID_START_HOUR + h) * SLOTS_PER_HOUR)}");
  });

  it("the legend explains every state the grid can render", () => {
    for (const colour of ["#22c55e", "#fbbf24", "#ef4444", "#a855f7", "#38bdf8"]) {
      expect(src).toContain(`background: "${colour}", marginRight: 3`);
    }
    expect(src).toContain("Working elsewhere</span>");
  });
});
