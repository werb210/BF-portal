// BF_PORTAL_SEQ_TASK_STEP_v1 — task capability now lives in the shared canvas.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "components", "marketing", "SequenceCanvas.tsx"), "utf-8");
describe("sequence task step (canvas)", () => {
  it("retains task type, priority, queue, title, notes, and pause", () => {
    for (const field of ["taskType", "taskPriority", "taskQueueId", "taskTitle", "taskNotes", "taskPause"]) expect(src).toContain(field);
    expect(src).toContain("Pause sequence until this task is completed");
  });
});
