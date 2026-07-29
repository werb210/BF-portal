import { describe, expect, it } from "vitest";
import { serializeNodes, type SequenceNode } from "../SequenceCanvas";

const send = (id: string, kind: SequenceNode["kind"] = "email"): SequenceNode => ({ id, kind, templateId: "tpl", condition: "always" });
const wait = (id: string, waitValue: number, waitUnit: "minutes" | "hours" | "days"): SequenceNode => ({ id, kind: "wait", waitValue, waitUnit });

describe("SequenceCanvas wire adapters", () => {
  it("folds and sums visible wait nodes into the following BF step", () => {
    expect(serializeNodes([wait("w1", 1, "hours"), wait("w2", 2, "days"), send("e")], "bf")).toEqual([
      expect.objectContaining({ channel: "email", wait_minutes: 2940, template_id: "tpl" }),
    ]);
  });
  it("uses BI position/delay/conditions and guards its email-only contract", () => {
    expect(serializeNodes([wait("w", 2, "minutes"), send("s", "sms")], "bi")).toEqual([
      expect.objectContaining({ type: "email", position: 0, delay_seconds: 120, conditions: { rule: "always" } }),
    ]);
  });
  it("keeps all task configuration", () => {
    const task: SequenceNode = { id: "t", kind: "task", taskType: "CALL", taskTitle: "Follow up", taskPriority: "HIGH", taskQueueId: "queue", taskNotes: "Notes", taskPause: true };
    expect(serializeNodes([task], "bf")[0]).toEqual(expect.objectContaining({ subject: "Follow up", body: "Notes", taskType: "CALL", taskPriority: "HIGH", taskQueueId: "queue", taskPause: true }));
  });
});
