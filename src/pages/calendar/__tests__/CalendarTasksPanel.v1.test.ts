// BF_PORTAL_CAL_TASKS_HUBSPOT_v1 - verifies the Calendar tab's full HubSpot-style Tasks panel wiring.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarTasksPanel.tsx"), "utf-8");
const page = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarPage.tsx"), "utf-8");

describe("calendar tasks panel (hubspot)", () => {
  it("is mounted on the Calendar page instead of the old aside", () => {
    expect(page).toContain("<CalendarTasksPanel");
    expect(page).toContain("import CalendarTasksPanel");
  });

  it("uses the /api/tasks backend, not /api/calendar/tasks", () => {
    expect(panel).toContain("/api/tasks?");
    expect(panel).toContain("/api/tasks/runs");
    expect(panel).toContain("/api/tasks/queues");
    expect(panel).not.toContain("/api/calendar/tasks");
  });

  it("create dialog has a Task type field and a custom (non-native) date picker", () => {
    expect(panel).toContain("Task type");
    expect(panel).toContain("function DateTimePicker");
    expect(panel).not.toContain('type="datetime-local"');
  });

  it("reuses the runner and manage-queues, and offers Start N tasks", () => {
    expect(panel).toContain("<TaskRunner");
    expect(panel).toContain("<ManageQueuesModal");
    expect(panel).toContain("Start {tasks.length} tasks");
  });
});
