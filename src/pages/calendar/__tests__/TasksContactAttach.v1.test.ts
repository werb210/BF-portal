// BF_PORTAL_UNIFIED_TASK_MODAL_v1 - all task create surfaces use the shared rich modal.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const modal = readFileSync(join(process.cwd(), "src", "components", "tasks", "TaskModal.tsx"), "utf-8");
const calendar = readFileSync(join(process.cwd(), "src", "pages", "calendar", "CalendarTasksPanel.tsx"), "utf-8");
const tasksPage = readFileSync(join(process.cwd(), "src", "pages", "tasks", "TasksPage.tsx"), "utf-8");
const actionBar = readFileSync(join(process.cwd(), "src", "components", "crm", "ActionBar.tsx"), "utf-8");

describe("unified task modal contact attachment", () => {
  it("shared modal owns contact picking, queue/staff loading, and /api/tasks creation", () => {
    expect(modal).toContain("BF_PORTAL_UNIFIED_TASK_MODAL_v1");
    expect(modal).toContain("crmApi.listContacts");
    expect(modal).toContain("/api/tasks/queues");
    expect(modal).toContain("/api/tasks/staff");
    expect(modal).toContain('api.post("/api/tasks"');
    expect(modal).toContain("contact_id: contactId || null");
    expect(modal).toContain("company_id: companyId || null");
  });

  it("calendar and tasks page use TaskModal instead of local create dialogs", () => {
    expect(calendar).toContain('import TaskModal from "@/components/tasks/TaskModal"');
    expect(calendar).toContain("<TaskModal");
    expect(calendar).not.toContain("function CreateTaskDialog");
    expect(tasksPage).toContain('import TaskModal from "@/components/tasks/TaskModal"');
    expect(tasksPage).toContain("<TaskModal");
    expect(tasksPage).not.toContain("function CreateTaskModal");
  });

  it("CRM action bar locks the current record into TaskModal and removes TaskPopup", () => {
    expect(actionBar).toContain("BF_PORTAL_UNIFIED_TASK_MODAL_v1");
    expect(actionBar).toContain("contact={scope.kind === \"contact\"");
    expect(actionBar).toContain("companyId={scope.kind === \"company\"");
    expect(existsSync(join(process.cwd(), "src", "components", "crm", "popups", "TaskPopup.tsx"))).toBe(false);
  });
});
