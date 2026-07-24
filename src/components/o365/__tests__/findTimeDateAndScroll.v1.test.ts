// BF_PORTAL_FINDTIME_DATE_AND_SCROLL_v1 - Find-a-Time can choose days and scrolls the aligned grid.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "src", "components", "o365", "FindATimePanel.tsx"), "utf-8");

describe("FindATimePanel date picker and scrolling grid", () => {
  it("adds date navigation and sends the selected local day to the schedule API", () => {
    expect(panel).toContain('type="date"');
    expect(panel).toContain("setSelectedDate((value) => addLocalDays(value, -1))");
    expect(panel).toContain("setSelectedDate((value) => addLocalDays(value, 1))");
    expect(panel).toContain("setSelectedDate(dateInputValue(new Date()))");
    expect(panel).toContain("const win = localDayWindow(selectedDate);");
  });

  it("parses YYYY-MM-DD field-by-field instead of relying on UTC date parsing", () => {
    expect(panel).toContain("new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0)");
    expect(panel).not.toContain('new Date(value)');
    expect(panel).not.toContain('new Date(dateValue)');
  });

  it("keeps the ruler and availability rows in one horizontal scroll container without changing geometry", () => {
    expect(panel).toContain('overflowX: "auto"');
    expect(panel).toContain("minWidth: LABEL_GUTTER_PX + (LAST_SLOT - FIRST_SLOT) * SLOT_PX");
    expect(panel).toContain("const SLOT_PX = 14;");
    expect(panel).toContain("const HOUR_PX = SLOTS_PER_HOUR * SLOT_PX;");
    expect(panel).toContain("const LABEL_GUTTER_PX = 150;");
  });

  it("names the displayed day in the footer instead of always saying today", () => {
    expect(panel).toContain("const selectedDayLabel = useMemo(() => displayDay(selectedDate), [selectedDate]);");
    expect(panel).toContain("{selectedDayLabel}, {GRID_START_HOUR}:00 - {GRID_END_HOUR}:00 local");
    expect(panel).not.toContain("Today, {GRID_START_HOUR}:00 - {GRID_END_HOUR}:00 local");
  });
});
