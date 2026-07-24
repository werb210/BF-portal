// BF_PORTAL_FINDTIME_RULER_ALIGN_v1
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(
  path.join(process.cwd(), "src/components/o365/FindATimePanel.tsx"),
  "utf8",
);

describe("free/busy ruler lines up with the availability blocks", () => {
  it("ruler and blocks share the same label gutter", () => {
    expect(src).toContain("const LABEL_GUTTER_PX = 150;");
    expect(src).toContain("flex: `0 0 ${LABEL_GUTTER_PX}px`");
    expect(src).not.toContain("paddingLeft: LABEL_GUTTER_PX");
  });

  it("all time columns are fluid instead of fixed pixel tracks", () => {
    expect(src).toContain('flex: "1 1 0"');
    expect(src).toContain("minWidth: 0");
    expect(src).not.toContain("const SLOT_PX = 14;");
    expect(src).not.toContain("const HOUR_PX = SLOTS_PER_HOUR * SLOT_PX;");
    expect(src).not.toContain("minWidth: LABEL_GUTTER_PX + (LAST_SLOT - FIRST_SLOT) * SLOT_PX");
    expect(src).not.toContain("flex: `0 0 ${SLOT_PX}px`");
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
