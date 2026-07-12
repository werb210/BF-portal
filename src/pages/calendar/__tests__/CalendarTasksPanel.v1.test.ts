// BF_PORTAL_CAL_TASKS_HUBSPOT_v1 - verifies the Calendar tab's full HubSpot-style Tasks panel wiring.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarTasksPanel.tsx"), "utf-8");
const page = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarPage.tsx"), "utf-8");
const modal = readFileSync(join(process.cwd(), "src", "components", "tasks", "TaskModal.tsx"), "utf-8");
// BF_PORTAL_SHARED_DATETIME_PICKER_v1 - the picker moved out of TaskModal into a
// shared component so the CRM Meeting popup uses the SAME one. Same intent (a custom,
// non-native picker), new home - so assert it there rather than deleting the check.
const picker = readFileSync(join(process.cwd(), "src", "components", "ui", "DateTimePicker.tsx"), "utf-8");

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

  it("create dialog is delegated to the shared TaskModal with a custom (non-native) date picker", () => {
    expect(panel).toContain("<TaskModal");
    expect(modal).toContain("Task type");
    expect(modal).toContain('DateTimePicker from "@/components/ui/DateTimePicker"');
    expect(picker).toContain("function DateTimePicker");
    expect(modal).not.toContain('type="datetime-local"');
    expect(picker).not.toContain('type="datetime-local"');
  });

  it("reuses the runner and manage-queues, and offers Start N tasks", () => {
    expect(panel).toContain("<TaskRunner");
    expect(panel).toContain("<ManageQueuesModal");
    expect(panel).toContain("Start {tasks.length} tasks");
  });
});
