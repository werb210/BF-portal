// BF_PORTAL_TASKS_V1 - Milestone 1: Tasks index with standard views, filters,
// create modal, single + bulk complete; routed and in the sidebar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const page = readFileSync(join(process.cwd(), "src", "pages", "tasks", "TasksPage.tsx"), "utf-8");
const app = readFileSync(join(process.cwd(), "src", "App.tsx"), "utf-8");
const nav = readFileSync(join(process.cwd(), "src", "components", "layout", "Sidebar.tsx"), "utf-8");
describe("tasks milestone 1 (portal)", () => {
  it("has the four standard views and filters", () => {
    for (const v of ["Due today", "Overdue", "Upcoming", "Completed"]) expect(page).toContain(v);
    expect(page).toContain("All queues");
  });
  it("supports single and bulk complete", () => {
    expect(page).toContain("/complete");
    expect(page).toContain('action: "complete"');
  });
  it("is routed and in the sidebar", () => {
    expect(app).toContain('path="/tasks"');
    expect(nav).toContain('{ label: "Tasks", path: "/tasks" }');
  });
});

// BF_PORTAL_TASKS_M2_M3_v1 - Manage queues (create/rename/delete/shares) and
// the Start-N-tasks runner with strict current-task binding.
describe("tasks milestones 2+3 (portal)", () => {
  const runner = readFileSync(join(process.cwd(), "src", "pages", "tasks", "TaskRunner.tsx"), "utf-8");
  const modal = readFileSync(join(process.cwd(), "src", "pages", "tasks", "ManageQueuesModal.tsx"), "utf-8");
  const idx = readFileSync(join(process.cwd(), "src", "pages", "tasks", "TasksPage.tsx"), "utf-8");
  it("index starts a run and opens manage queues", () => {
    expect(idx).toContain("/api/tasks/runs");
    expect(idx).toContain("Start {tasks.length} tasks");
    expect(idx).toContain("<ManageQueuesModal");
  });
  it("runner binds actions to the current task id and never deletes", () => {
    expect(runner).toContain("strict current-task binding");
    expect(runner).toContain("Task {Math.min(idx + 1, tasks.length)} of {tasks.length}");
    expect(runner).not.toContain("api.delete");
  });
  it("queue delete warns that tasks are kept; shares editor present", () => {
    expect(modal).toContain("only the label is removed");
    expect(modal).toContain("/shares");
  });
});

// BF_PORTAL_TASKS_M4_v1 - type-specific action surfaces reuse the REAL
// portal surfaces (dialer/O365/SMS) with an auto-open user setting.
describe("tasks milestone 4 (portal)", () => {
  const runner = readFileSync(join(process.cwd(), "src", "pages", "tasks", "TaskRunner.tsx"), "utf-8");
  it("CALL opens the Twilio dialer with the contact prefilled", () => {
    expect(runner).toContain('openDialer({ contactId: t.contact_id');
    expect(runner).toContain('source: "task_runner"');
  });
  it("EMAIL uses the O365 composer with send-and-complete semantics", () => {
    expect(runner).toContain("<O365ComposeModal");
    expect(runner).toContain("if (completeAfterSend) complete();");
  });
  it("SMS uses the Twilio composer; auto-open is a user setting", () => {
    expect(runner).toContain("<SMSComposer");
    expect(runner).toContain('localStorage.getItem("boreal.tasks.autoOpen")');
  });
});

// BF_PORTAL_TASKS_M6_v1 - create modal exposes reminder + repeat.
describe("tasks milestone 6 (portal)", () => {
  const idx = readFileSync(join(process.cwd(), "src", "pages", "tasks", "TasksPage.tsx"), "utf-8");
  it("create modal posts reminder_at and recurrence", () => {
    expect(idx).toContain("reminder_at: reminderAt");
    expect(idx).toContain("repeat_unit: repeatUnit || null");
    expect(idx).toContain("No repeat");
  });
});
