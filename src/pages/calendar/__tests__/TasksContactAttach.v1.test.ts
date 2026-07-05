// BF_PORTAL_TASKS_CONTACT_PICKER_v1 + TASKS_UNIFY_v1 - both create surfaces
// attach a contact and write to /api/tasks so the runner knows who to open.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const panel = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarTasksPanel.tsx"), "utf-8");
const popup = readFileSync(join(process.cwd(), "src", "components", "crm", "popups", "TaskPopup.tsx"), "utf-8");
describe("tasks contact attachment", () => {
  it("calendar dialog has a search contact picker, required for Call/Email/SMS", () => {
    expect(panel).toContain("crmApi.listContacts");
    expect(panel).toContain("needsContact && !contactId");
    expect(panel).toContain("contact_id: contactId || null");
  });
  it("CRM record popup writes to /api/tasks with contact auto-attached + SMS", () => {
    expect(popup).toContain('api.post("/api/tasks"');
    expect(popup).toContain("contact_id: contactId");
    expect(popup).toContain('"SMS"');
    expect(popup).not.toContain("crmApi.tasks.create");
  });
});
