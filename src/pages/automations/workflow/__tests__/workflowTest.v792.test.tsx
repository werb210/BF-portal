// BF_PORTAL_v792 - build, test, then turn on: the Test button and panel, the log fallback for older
// servers, visited-step outlines, the "Draft" status and the turn-on message. workflowApi is
// exercised through a mocked api that answers by URL.
import "./flowEnv";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  post: [] as Array<[string, any]>,
  patch: [] as Array<[string, any]>,
  gets: [] as string[],
  validate: [] as Array<{ nodeId: string | null; message: string }>,
  withSteps: true,
}));
const workflow = {
  id: "w1", name: "Lead follow-up", silo: "BF", enabled: false,
  graph: {
    triggers: [{ type: "contact.created", filters: [], filterLogic: "all" }],
    startNodeId: "n1",
    nodes: {
      n1: { id: "n1", kind: "action", action: "add_tag", params: { tag: "hot" }, next: "n2" },
      n2: { id: "n2", kind: "delay", mode: "duration", params: { amount: 1, unit: "days" }, next: "n3" },
      n3: { id: "n3", kind: "action", action: "add_note", params: { body: "done" }, next: null },
    },
  },
  settings: { reenroll: "never", quietHours: { enabled: false, start: "09:00", end: "20:00", tz: "America/Edmonton" }, unenrollOnGoal: true, testMode: false },
  goal: null,
};
const STEPS = [
  { step_index: 0, node_id: "n1", step_type: "add_tag", outcome: "dry_run", detail: "would run: add_tag" },
  { step_index: 1, node_id: "n2", step_type: "delay", outcome: "dry_run", detail: "would wait 1 day" },
];
const empty = { id: "w9", name: "Empty one", silo: "BF", enabled: false, graph: { triggers: [], startNodeId: null, nodes: {} }, settings: workflow.settings, goal: null };

vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    state.gets.push(url);
    if (url === "/api/automations/catalog") return { triggers: [{ type: "contact.created", label: "A contact is created", group: "Contacts", filterFields: [] }] };
    if (url === "/api/automations/w1") return JSON.parse(JSON.stringify(workflow));
    if (url === "/api/automations/w9") return JSON.parse(JSON.stringify(empty));
    if (url.startsWith("/api/meetings/people")) return { people: [{ contactId: "c9", name: "Zed Contact", email: "zed@example.com" }] };
    if (url === "/api/automations/enrollments/en1/log") return STEPS;
    return [];
  });
  const post = vi.fn(async (url: string, body: any) => {
    state.post.push([url, body]);
    if (url.endsWith("/validate")) return { issues: state.validate };
    if (url === "/api/automations/w1/enroll") return state.withSteps ? { enrollmentId: "en1", outcome: "completed", testMode: true, steps: STEPS } : { enrollmentId: "en1", outcome: "completed" };
    if (url === "/api/automations") return { ...body, id: "w77", issues: [] };
    return {};
  });
  const patch = vi.fn(async (url: string, body: any) => { state.patch.push([url, body]); return { ...workflow, ...body, id: "w1" }; });
  return { api: Object.assign(get, { get, post, patch, delete: vi.fn(async () => ({})) }) };
});

import { AuthContext } from "@/auth/AuthContext";
import WorkflowEditor from "../WorkflowEditor";

const asRole = (role: string) => (n: ReactNode) => <AuthContext.Provider value={{ user: { role }, role } as never}>{n}</AuthContext.Provider>;
function renderEditor(path = "/automations/w1", wrap: (n: ReactNode) => ReactNode = (n) => n) {
  return render(<>{wrap(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/automations/:id" element={<WorkflowEditor />} /></Routes>
    </MemoryRouter>,
  )}</>);
}
const card = (nodeId: string) => document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;

async function runTestFor() {
  fireEvent.click(screen.getByRole("button", { name: "Test" }));
  const panel = await screen.findByTestId("test-panel");
  expect(within(panel).getByRole("heading", { name: "Test this workflow" })).toBeInTheDocument();
  fireEvent.change(within(panel).getByLabelText("Search contacts"), { target: { value: "zed" } });
  fireEvent.click(await within(panel).findByText("Zed Contact"));
  fireEvent.click(within(panel).getByRole("button", { name: "Run test" }));
  return panel;
}

beforeEach(() => { state.post.length = 0; state.patch.length = 0; state.gets.length = 0; state.validate = []; state.withSteps = true; });

describe("workflow Test button", () => {
  it("opens the panel and shows each step with readable outcomes while the workflow is a draft", async () => {
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    expect(screen.getByRole("switch", { name: "Workflow on" })).toHaveAttribute("aria-checked", "false");
    const panel = await runTestFor();
    const result = await within(panel).findByTestId("test-result");
    expect(result).toHaveTextContent("Test run for Zed Contact - nothing was sent or changed.");
    const steps = within(result).getAllByTestId("test-step");
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent("1. Add tag");
    expect(steps[0]).toHaveTextContent("Would run");
    expect(steps[0]).toHaveTextContent("would run: add_tag");
    expect(steps[1]).toHaveTextContent("2. Delay");
    expect(steps[1]).toHaveTextContent("Would wait");
    expect(state.post.find(([u]) => u === "/api/automations/w1/enroll")?.[1]).toEqual({ contactId: "c9", testMode: true });
    // Never turned on, never asked for the log when steps came back.
    expect(state.patch.some(([, b]) => b.enabled === true)).toBe(false);
    expect(state.gets.some((u) => u.includes("/log"))).toBe(false);
  });

  it("outlines the visited steps and clears the outline when the panel closes", async () => {
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    const panel = await runTestFor();
    await within(panel).findByTestId("test-result");
    await waitFor(() => expect(card("n1")).toHaveAttribute("data-test-visited", "true"));
    expect(card("n2")).toHaveAttribute("data-test-visited", "true");
    expect(card("n3")).not.toHaveAttribute("data-test-visited");
    fireEvent.click(within(panel).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByTestId("test-panel")).toBeNull());
    expect(card("n1")).not.toHaveAttribute("data-test-visited");
  });

  it("falls back to the enrollment log when the server sends no steps", async () => {
    state.withSteps = false;
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    const panel = await runTestFor();
    const result = await within(panel).findByTestId("test-result");
    expect(state.gets).toContain("/api/automations/enrollments/en1/log");
    expect(within(result).getAllByTestId("test-step")).toHaveLength(2);
    expect(result).toHaveTextContent("Would wait");
  });

  it("saves unsaved changes before testing", async () => {
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Edit workflow name" }));
    fireEvent.change(screen.getByLabelText("Workflow name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    await screen.findByTestId("test-panel");
    expect(state.patch.find(([u]) => u === "/api/automations/w1")?.[1]).toMatchObject({ name: "Renamed", enabled: false });
  });

  it("an empty workflow asks for a step instead of opening the panel", async () => {
    renderEditor("/automations/w9");
    await screen.findByText("Empty one");
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    expect(await screen.findByText("Add at least one step to test.")).toBeInTheDocument();
    expect(screen.queryByTestId("test-panel")).toBeNull();
    expect(state.post.some(([u]) => u.endsWith("/enroll"))).toBe(false);
  });

  it("Staff can test a workflow they cannot edit; Admin and Marketing see Test too", async () => {
    for (const role of ["Staff", "Admin", "Marketing"]) {
      const view = renderEditor("/automations/w1", asRole(role));
      await waitFor(() => expect(card("n1")).toBeTruthy());
      expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
      view.unmount();
    }
    renderEditor("/automations/w1", asRole("Staff"));
    await waitFor(() => expect(card("n1")).toBeTruthy());
    const panel = await runTestFor();
    expect(await within(panel).findByTestId("test-result")).toHaveTextContent("nothing was sent or changed");
    expect(state.patch).toHaveLength(0);
  });
});

describe("Draft status and turning on", () => {
  it("shows Draft next to the switch while off", async () => {
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    expect(screen.getByTestId("workflow-status")).toHaveTextContent("Draft");
    expect(screen.getByRole("switch", { name: "Workflow on" })).toBeInTheDocument();
  });

  it("switching on with issues explains it can stay a draft; Save never shows that message", async () => {
    state.validate = [{ nodeId: "n3", message: "Write the note" }];
    renderEditor();
    await waitFor(() => expect(card("n1")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(screen.queryByText(/Fix these before turning it on/)).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "Workflow on" }));
    expect(await screen.findByText("Fix these before turning it on: 1 issue. You can keep building and testing while it's a draft.")).toBeInTheDocument();
    expect(state.patch.some(([, b]) => b.enabled === true)).toBe(false);
    expect(screen.getByTestId("workflow-status")).toHaveTextContent("Draft");
  });

  it("a new workflow with no trigger and no steps saves", async () => {
    renderEditor("/automations/new");
    await screen.findByText("Unnamed workflow");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.post.find(([u]) => u === "/api/automations")?.[1]).toMatchObject({ enabled: false, graph: { triggers: [], startNodeId: null, nodes: {} } }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });
});
