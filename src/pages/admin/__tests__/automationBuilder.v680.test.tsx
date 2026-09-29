// BF_PORTAL_AUTOMATION_BUILDER_v680
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const calls = vi.hoisted(() => ({ post: [] as Array<[string, any]>, patch: [] as Array<[string, any]> }));
const catalog = {
  triggers: [{ key: "application.stage_changed", label: "Application stage changes", fields: ["to_stage", "requested_amount"] }, { key: "call.missed", label: "An inbound call is missed", fields: ["contact_tag"] }],
  fields: { to_stage: { label: "To stage", type: "stage" }, requested_amount: { label: "Requested amount", type: "number" }, contact_tag: { label: "Contact tag", type: "list" } },
  operators: ["eq", "gt", "is_set"],
  actions: [{ key: "create_task", label: "Create a task" }, { key: "send_sms", label: "Send a text message" }, { key: "wait", label: "Wait" }, { key: "team_post", label: "Post in a Team channel" }],
  checks: [{ key: "still_in_stage", label: "the application is still in the stage that started this" }],
  stages: ["Received", "Offer"],
};
vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    if (url === "/api/automations/catalog") return { success: true, data: catalog };
    if (url === "/api/automations") return { success: true, data: [{ id: "r1", name: "Offer follow-up", trigger_type: "application.stage_changed", conditions: [{ field: "to_stage", op: "eq", value: "Offer" }], steps: [{ type: "wait", amount: 2, unit: "days" }, { type: "create_task", title: "Chase the offer" }], enabled: true, reenroll: "never", test_mode: false, active_count: 3, total_count: 9 }] };
    if (url === "/api/users") return { users: [{ id: "u1", first_name: "Andrew", last_name: "P" }] };
    return { success: true, data: [] };
  });
  return { api: Object.assign(get, { get, post: vi.fn(async (u: string, b: any) => { calls.post.push([u, b]); return { success: true, data: {} }; }), patch: vi.fn(async (u: string, b: any) => { calls.patch.push([u, b]); return {}; }), delete: vi.fn(async () => ({})) }) };
});

import AutomationsPage, { describeRule, newStep, stepProblem } from "@/pages/admin/AutomationsPage";

describe("automation builder", () => {
  it("describes rules in plain words", () => {
    expect(describeRule({ trigger_type: "application.stage_changed", conditions: [{ field: "to_stage", op: "eq", value: "Offer" }], steps: [{ type: "wait", amount: 2, unit: "days" }, { type: "create_task", title: "x" }] }, catalog as any))
      .toBe('When application stage changes and to stage is "Offer": wait 2 days, then create a task');
  });

  it("checks steps the way the server does", () => {
    expect(stepProblem(newStep("create_task"))).toBe("Give the task a title");
    expect(stepProblem({ ...newStep("send_sms"), body: "Hi {{first_name}}" })).toBeNull();
    expect(stepProblem({ type: "wait", amount: 0 })).toBe("Set how long to wait");
    expect(stepProblem({ ...newStep("team_post"), channel: "" })).toBe("Name the channel");
  });

  it("lists rules and saves a new one in the engine's format (conditions list + steps)", async () => {
    render(<AutomationsPage />);
    await screen.findByText("Offer follow-up");
    expect(screen.getByText(/3 running/)).toBeTruthy();
    fireEvent.click(screen.getByText("+ New automation"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Missed call text" } });
    fireEvent.change(screen.getByLabelText("Trigger"), { target: { value: "call.missed" } });
    fireEvent.change(screen.getByLabelText("Step type"), { target: { value: "send_sms" } });
    fireEvent.change(screen.getByLabelText("Text message"), { target: { value: "Sorry we missed you, {{first_name}}" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(calls.post.length).toBe(1));
    expect(calls.post[0]).toEqual(["/api/automations", { name: "Missed call text", description: null, trigger_type: "call.missed", conditions: [], steps: [{ type: "send_sms", body: "Sorry we missed you, {{first_name}}", purpose: "transactional" }], reenroll: "never", enabled: false, test_mode: false }]);
  });

  it("refuses to save a step the server would reject", async () => {
    render(<AutomationsPage />);
    await screen.findByText("Offer follow-up");
    fireEvent.click(screen.getByText("+ New automation"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "No title" } });
    fireEvent.click(screen.getByText("Save"));
    await screen.findByText("Step 1: Give the task a title");
  });
});
