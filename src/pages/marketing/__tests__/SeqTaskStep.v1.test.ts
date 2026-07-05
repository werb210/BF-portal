// BF_PORTAL_SEQ_TASK_STEP_v1 (Tasks Milestone 5) - the sequence builder
// supports a Task step (type/priority/queue/title/notes) with
// pause-until-complete on by default.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "pages", "marketing", "MarketingDashboard.tsx"), "utf-8");
describe("sequence task step (builder)", () => {
  it("Task is a channel option with its own fields", () => {
    expect(src).toContain('<option value="task">Task</option>');
    expect(src).toContain("Pause sequence until this task is completed");
    expect(src).toContain('taskPause: true');
  });
  it("task steps validate on title, not template, and post the task fields", () => {
    expect(src).toContain('s.channel === "task" ? !s.taskTitle.trim() : !s.templateId');
    expect(src).toContain("taskQueueId: s.taskQueueId || null");
  });
});
