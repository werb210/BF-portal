import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import SequenceCanvas, { serializeNodes, type SequenceNode } from "../SequenceCanvas";

describe("sequence step assignee v1", () => {
  it("keeps the BF contact-owner fallback as a real optional choice", () => {
    render(createElement(SequenceCanvas, { silo: "bf", staff: [{ id: "staff-1", name: "Alex Staff" }], onSave: vi.fn() }));
    fireEvent.click(screen.getByRole("button", { name: "+ Task" }));
    expect(screen.getByTestId("bf-task-assignee")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Contact's owner (default)" })).toBeInTheDocument();
  });

  it("serializes a blank BF assignee as null for the server fallback", () => {
    const task: SequenceNode = { id: "task-1", kind: "task", taskTitle: "Call" };
    expect(serializeNodes([task], "bf")[0]).toHaveProperty("assignee_user_id", null);
  });
});
