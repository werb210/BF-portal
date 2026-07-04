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
