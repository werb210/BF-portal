// BF_PORTAL_BLOCK_v592_WIDGET_SIZES
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("ios/App/BorealWidget/SummaryWidget.swift", "utf8");
describe("iPad widget sizes", () => {
  it("offers extra-large and the three lock-screen sizes", () => {
    expect(src).toContain(".systemExtraLarge, .accessoryInline, .accessoryCircular, .accessoryRectangular");
    for (const v of ["ExtraLargeSummary(entry: entry)", "InlineSummary(entry: entry)", "CircularSummary(entry: entry)", "RectangularSummary(entry: entry)"]) expect(src).toContain(v);
  });
  it("lock-screen sizes open the pipeline and never show the long sign-in text", () => {
    expect(src).toContain('if entry.needsData && isAccessory {');
    expect(src).toContain('RectangularSummary(entry: entry).widgetURL(deepLink("pipeline", entry.silo))');
  });
});
