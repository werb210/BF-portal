import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarPage.tsx"), "utf-8");

describe("BF_PORTAL_TASKS_ABOVE_ROOMS_v739", () => {
  it("renders the Tasks panel above the Conference rooms panel", () => {
    const tasks = page.indexOf("<CalendarTasksPanel ");
    const rooms = page.indexOf("<MeetingRoomsPanel />");
    expect(tasks).toBeGreaterThan(-1);
    expect(rooms).toBeGreaterThan(-1);
    expect(tasks).toBeLessThan(rooms);
  });
});
