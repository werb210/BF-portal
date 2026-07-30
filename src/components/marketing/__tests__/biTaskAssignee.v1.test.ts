import { describe, expect, it } from "vitest";
import { serializeNodes, type SequenceNode } from "../SequenceCanvas";

describe("BI task assignee v1", () => {
  it("serializes the explicit assignee for BI task steps", () => {
    const task: SequenceNode = {
      id: "task-1",
      kind: "task",
      taskTitle: "Call the prospect",
      assigneeUserId: "user-42",
    };

    expect(serializeNodes([task], "bi")[0]).toEqual(expect.objectContaining({
      type: "task",
      assignee_user_id: "user-42",
    }));
  });

  it("does not add BI-only assignee fields to BF task steps", () => {
    const task: SequenceNode = { id: "task-1", kind: "task", taskTitle: "Call", assigneeUserId: "user-42" };
    expect(serializeNodes([task], "bf")[0]).not.toHaveProperty("assignee_user_id");
  });
});
