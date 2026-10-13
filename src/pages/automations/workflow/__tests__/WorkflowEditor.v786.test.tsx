// BF_PORTAL_v786_WORKFLOW_BUILDER - the full-screen editor against a mocked api: canvas cards,
// "Changes needed", insert at +, delete, Review issues, blocked enable, Performance and History.
import "./flowEnv";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ post: [] as Array<[string, any]>, patch: [] as Array<[string, any]>, validate: [] as Array<{ nodeId: string | null; message: string }> }));
const workflow = {
  id: "w1", name: "New lead nurture", silo: "BF", enabled: false,
  graph: {
    triggers: [{ type: "contact.created", filters: [{ field: "lifecycle_stage", op: "eq", value: "lead" }], filterLogic: "all" }],
    startNodeId: "n1",
    nodes: {
      n1: { kind: "action", action: "set_property", params: { field: "lifecycle_stage", value: "lead" }, next: "n2" },
      n2: { kind: "delay", mode: "duration", params: { amount: 2, unit: "days" }, next: "n3" },
      n3: { kind: "action", action: "send_email", params: { templateId: "" }, next: null },
    },
  },
  settings: { reenroll: "never", quietHours: { enabled: false, start: "21:00", end: "08:00", tz: "America/Edmonton" }, unenrollOnGoal: true, testMode: false },
  goal: null,
};
const catalog = {
  triggers: [{ type: "contact.created", label: "Contact is created", group: "Contacts", filterFields: ["lifecycle_stage"] }],
  fields: { lifecycle_stage: { label: "Lifecycle Stage", type: "select", options: [{ value: "lead", label: "Lead" }] } },
  operators: ["eq"],
  templates: { email: [{ id: "t1", name: "Welcome email" }], sms: [] },
  stages: ["Received"],
};

vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    if (url === "/api/automations/catalog") return catalog;
    if (url === "/api/automations/w1") return JSON.parse(JSON.stringify(workflow));
    if (url === "/api/automations") return [{ id: "w1", name: "New lead nurture" }, { id: "w2", name: "Re-engage" }];
    if (url === "/api/automations/lists") return [{ id: "l1", name: "Hot leads" }];
    if (url === "/api/users") return { users: [{ id: "u1", first_name: "Andrew", last_name: "P" }] };
    if (url === "/api/automations/w1/performance") return { enrolled: 40, active: 12, completed: 20, goalReached: 10, byNode: { n1: { entered: 40, failed: 0 }, n2: { entered: 31, failed: 0 }, n3: { entered: 18, failed: 2 } } };
    if (url === "/api/automations/w1/history") return [
      { id: "e1", contact_id: "c1", label: "Jane Doe", created_at: "2026-10-01T15:00:00Z", status: "active", current_node_id: "n2", path: [{ nodeId: "n1", kind: "action", at: "2026-10-01T15:00:01Z", result: "Lifecycle Stage set to Lead" }] },
      { id: "e2", contact_id: "c2", label: "Bob Ray", created_at: "2026-10-02T15:00:00Z", status: "completed", current_node_id: null, path: [] },
    ];
    if (url.startsWith("/api/meetings/people")) return { people: [{ contactId: "c9", name: "Zed Contact", email: "zed@example.com" }] };
    return [];
  });
  const post = vi.fn(async (url: string, body: any) => {
    calls.post.push([url, body]);
    if (url.endsWith("/validate")) return { issues: calls.validate };
    return {};
  });
  const patch = vi.fn(async (url: string, body: any) => { calls.patch.push([url, body]); return { ...workflow, ...body, id: "w1" }; });
  return { api: Object.assign(get, { get, post, patch, delete: vi.fn(async () => ({})) }) };
});

import WorkflowEditor from "../WorkflowEditor";

function renderEditor(path = "/automations/w1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/automations/:id" element={<WorkflowEditor />} /></Routes>
    </MemoryRouter>,
  );
}
const card = (nodeId: string) => document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;

beforeEach(() => { calls.post.length = 0; calls.patch.length = 0; calls.validate = []; });

describe("WorkflowEditor", () => {
  it("draws the trigger, numbered cards with summaries and Changes needed", async () => {
    renderEditor();
    await screen.findByText("New lead nurture");
    expect(screen.getByRole("tab", { name: "Actions" })).toHaveAttribute("aria-selected", "true");
    ["Settings", "Performance", "History"].forEach((t) => expect(screen.getByRole("tab", { name: t })).toBeInTheDocument());
    const trigger = await screen.findByTestId("trigger-card");
    await waitFor(() => expect(trigger).toHaveTextContent("Contact is created and Lifecycle Stage is Lead"));
    expect(trigger).toHaveTextContent("Re-enroll off");
    await waitFor(() => expect(card("n1")).toHaveTextContent("1. Edit record"));
    expect(card("n1")).toHaveTextContent("Set Lifecycle Stage to Lead");
    expect(card("n2")).toHaveTextContent("2. Delay");
    expect(card("n2")).toHaveTextContent("Delay 2 days");
    expect(card("n3")).toHaveTextContent("3. Send email");
    expect(within(card("n3")).getByTestId("changes-needed")).toBeInTheDocument();
    expect(within(card("n1")).queryByTestId("changes-needed")).toBeNull();
    expect(screen.getAllByTestId("plus-button")).toHaveLength(4);
    expect(screen.getAllByTestId("end-marker")).toHaveLength(1);
    expect(screen.getByLabelText("Workflow minimap")).toBeInTheDocument();
  });

  it("server /validate issues also mark a card", async () => {
    calls.validate = [{ nodeId: "n1", message: "Lifecycle Stage cannot be set to Lead twice" }];
    renderEditor();
    await waitFor(() => expect(within(card("n1")).getByTestId("changes-needed")).toBeInTheDocument());
  });

  it("inserts a step at a + and saves the graph", async () => {
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    const plus = document.querySelector('[data-slot="n1|next"]') as HTMLElement;
    fireEvent.click(plus);
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    fireEvent.change(screen.getByLabelText("Tag"), { target: { value: "hot" } });
    fireEvent.click(within(screen.getByTestId("side-panel")).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText('Add tag "hot"')).toBeInTheDocument());
    expect(card("n2")).toHaveTextContent("3. Delay");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.patch.length).toBe(1));
    const [url, body] = calls.patch[0]!;
    expect(url).toBe("/api/automations/w1");
    const newId = body.graph.nodes.n1.next as string;
    expect(body.graph.nodes[newId]).toEqual({ id: newId, kind: "action", action: "add_tag", params: { tag: "hot" }, next: "n2" });
    expect(body).toMatchObject({ name: "New lead nurture", silo: "BF", enabled: false, goal: null });
  });

  it("delete asks step only or the whole branch below", async () => {
    renderEditor();
    await waitFor(() => expect(card("n2")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Delete step 2"));
    const panel = screen.getByTestId("delete-panel");
    expect(within(panel).getByRole("button", { name: "Delete this step and everything below it" })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Delete this step only" }));
    await waitFor(() => expect(card("n2")).toBeNull());
    expect(card("n3")).toHaveTextContent("2. Send email");
  });

  it("Review issues lists problems, clicking one highlights the card, and enabling is blocked", async () => {
    renderEditor();
    await waitFor(() => expect(card("n3")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Review issues \(1\)/ }));
    const item = within(screen.getByTestId("issues-panel")).getByTestId("issue-item");
    expect(item).toHaveTextContent("3. Send email");
    expect(item).toHaveTextContent("Choose an email template");
    fireEvent.click(item);
    await waitFor(() => expect(card("n3")).toHaveClass("wf-card-flash"));
    fireEvent.click(screen.getByRole("switch", { name: "Workflow on" }));
    await screen.findByText(/Fix these before turning it on: 1 issue\. You can keep building and testing while it's a draft\./);
    expect(calls.patch.some(([, b]) => b.enabled === true)).toBe(false);
  });

  it("Performance shows totals and per-step badges", async () => {
    renderEditor();
    await screen.findByText("New lead nurture");
    fireEvent.click(screen.getByRole("tab", { name: "Performance" }));
    const stats = await screen.findByTestId("performance-stats");
    await waitFor(() => expect(stats).toHaveTextContent("Enrolled40"));
    expect(stats).toHaveTextContent("Active12");
    expect(stats).toHaveTextContent("Completed20");
    expect(stats).toHaveTextContent("Goal reached10 (25%)");
    await waitFor(() => expect(within(card("n2")).getByTestId("step-count")).toHaveTextContent("31"));
  });

  it("History lists enrollments, highlights a contact's path and enrolls a contact", async () => {
    renderEditor();
    await screen.findByText("New lead nurture");
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    const rows = await screen.findAllByTestId("history-row");
    expect(rows[0]).toHaveTextContent("Jane Doe");
    expect(rows[0]).toHaveTextContent("2. Delay");
    expect(rows[1]).toHaveTextContent("completed");
    fireEvent.click(rows[0]!);
    expect(screen.getByTestId("history-steps")).toHaveTextContent("1. Edit record - Lifecycle Stage set to Lead");
    await waitFor(() => expect(card("n1").style.border).toContain("var(--wf-highlight)"));
    expect(card("n3").style.border).not.toContain("var(--wf-highlight)");
    fireEvent.click(screen.getByRole("button", { name: "Enroll contact" }));
    fireEvent.change(screen.getByLabelText("Search contacts"), { target: { value: "zed" } });
    fireEvent.click(await screen.findByText("Zed Contact", {}, { timeout: 2000 }));
    await waitFor(() => expect(calls.post).toContainEqual(["/api/automations/w1/enroll", { contactId: "c9" }]));
  });

  it("move icon then a + moves the step", async () => {
    renderEditor();
    await waitFor(() => expect(card("n3")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Move step 3"));
    expect(screen.getByText(/Moving step 3/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(document.querySelector('[data-slot="trigger|start"]') as HTMLElement); });
    await waitFor(() => expect(card("n3")).toHaveTextContent("1. Send email"));
    expect(card("n1")).toHaveTextContent("2. Edit record");
  });

  it("settings tab shows the silo read-only and edits the goal", async () => {
    renderEditor();
    await screen.findByText("New lead nurture");
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.getByText("Contacts leave the workflow when they meet the goal.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Silo")).toBeNull();
    expect(screen.getByTestId("workflow-silo")).toHaveTextContent("BF - Boreal Financial");
    fireEvent.click(screen.getByRole("button", { name: "Set a goal" }));
    fireEvent.change(within(screen.getByTestId("goal-section")).getByLabelText("Property"), { target: { value: "lifecycle_stage" } });
    fireEvent.change(within(screen.getByTestId("goal-section")).getByLabelText("Value"), { target: { value: "lead" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls.patch.length).toBe(1));
    expect(calls.patch[0]![1]).toMatchObject({ silo: "BF", goal: { logic: "all", conditions: [{ field: "lifecycle_stage", op: "eq", value: "lead" }] } });
  });
});
