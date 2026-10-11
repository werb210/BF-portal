// BF_PORTAL_v787_BUILDER_FIXES - the builder screens against BF-Server shapes: detail forms write
// the server params, trigger params, quiet hours, Performance byNode, History label/path, error
// codes and trigger issues, topbar silo, With AI draft-then-create, timeline items, Staff read-only.
import "./flowEnv";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  post: [] as Array<[string, any]>,
  patch: [] as Array<[string, any]>,
  validate: [] as Array<{ nodeId: string | null; message: string }>,
  patchError: null as null | { status: number; details: unknown },
  draftError: null as null | { status: number; details: unknown },
  timeline: [] as any[],
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
  settings: { reenroll: "never", quietHours: { enabled: true, start: "09:00", end: "20:00", tz: "America/Edmonton" }, unenrollOnGoal: true, testMode: false },
  goal: null,
};
const serverCatalog = {
  triggers: [
    { type: "contact.created", label: "A contact is created", group: "Contacts", filterFields: ["source"] },
    { type: "date.relative", label: "A date is reached (days before/after)", group: "Dates", filterFields: ["lead_status"] },
    { type: "no_reply", label: "No reply after a number of days", group: "Messages", filterFields: [] },
  ],
  actions: [{ action: "set_contact_field", label: "Set a contact field", group: "Contact", params: [{ key: "field", label: "Field", type: "select", options: ["lead_status", "first_name"], required: true }, { key: "value", label: "Value", type: "text" }] }],
  fields: [
    { key: "source", label: "Source", type: "text", options: ["website_form"] },
    { key: "lead_status", label: "Lead status", type: "text" },
    { key: "score", label: "Score", type: "number" },
  ],
  operators: ["eq", "is_set"],
  templates: { email: [{ id: "t1", name: "Welcome" }], sms: [] },
  stages: ["Received", "Offer"],
};
const apiError = (e: { status: number; details: unknown }) => Object.assign(new Error("API_ERROR"), e);

vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    if (url === "/api/automations/catalog") return serverCatalog;
    if (url === "/api/automations/w1") return JSON.parse(JSON.stringify(workflow));
    if (url === "/api/automations") return [{ id: "w1", name: "Lead follow-up", silo: "BF", enabled: false, graph: workflow.graph }];
    if (url === "/api/users") return { users: [{ id: "u1", first_name: "Andrew", last_name: "P" }] };
    if (url === "/api/automations/w1/performance") return { enrolled: 5, active: 2, completed: 3, goalReached: 1, byNode: { n1: { entered: 5, failed: 0 }, n3: { entered: 3, failed: 2 } } };
    if (url === "/api/automations/w1/history") return [
      { id: "e1", status: "active", contact_id: "c1", current_node_id: "n2", label: "Jane Doe", created_at: "2026-10-01T15:00:00Z", path: [{ nodeId: "n1", kind: "action", at: "2026-10-01T15:00:01Z", result: "tag hot" }, { nodeId: "n2", kind: "delay", at: "2026-10-01T15:00:02Z", result: "wait 1 days" }] },
    ];
    if (url.endsWith("/emails") || url.endsWith("/calls")) return { items: [] };
    return [];
  });
  const post = vi.fn(async (url: string, body: any) => {
    state.post.push([url, body]);
    if (url.endsWith("/validate")) return { issues: state.validate };
    if (url === "/api/automations/draft-from-text") {
      if (state.draftError) throw apiError(state.draftError);
      return { name: "Drafted", graph: workflow.graph, settings: workflow.settings, goal: null };
    }
    if (url === "/api/automations") return { ...body, id: "w77", issues: [] };
    return {};
  });
  const patch = vi.fn(async (url: string, body: any) => {
    state.patch.push([url, body]);
    if (state.patchError) throw apiError(state.patchError);
    return { ...workflow, ...body, id: "w1" };
  });
  return { api: Object.assign(get, { get, post, patch, delete: vi.fn(async () => ({})) }) };
});
vi.mock("@/api/crm", () => ({ crmApi: { timeline: vi.fn(async () => state.timeline) } }));

import { AuthContext } from "@/auth/AuthContext";
import SiloContext from "@/context/SiloContext";
import { UnifiedTimeline, ITEM_KINDS } from "@/components/crm/UnifiedTimeline";
import AutomationsPage from "@/pages/admin/AutomationsPage";
import { NodeDetails, type FormContext } from "../DetailForms";
import { ACTIONS } from "../actions";
import { TriggerPanel } from "../SidePanel";
import { SettingsTab } from "../Tabs";
import WorkflowEditor from "../WorkflowEditor";
import { DEFAULT_SETTINGS, type Settings, type WorkflowNode } from "../types";
import { normalizeCatalog } from "../workflowApi";

const catalog = normalizeCatalog(serverCatalog);
const ctx: FormContext = { catalog, users: [{ id: "u1", name: "Andrew P" }], lists: [], workflows: [], nodes: {}, numbers: {} };
const make = (key: string): WorkflowNode => ACTIONS.find((a) => a.key === key)!.make();
const params = (n: WorkflowNode) => (n.kind === "action" || n.kind === "delay" ? n.params : {});

/** Renders a details form that keeps its own node, returning a getter for the latest node. */
function form(initial: WorkflowNode) {
  let node = initial;
  const ui = () => <NodeDetails node={node} onChange={(n) => { node = n; view.rerender(ui()); }} ctx={ctx} />;
  const view = render(ui());
  return () => node;
}
const optionTexts = (label: string) => Array.from((screen.getByLabelText(label) as HTMLSelectElement).options).map((o) => o.textContent);

beforeEach(() => { state.post.length = 0; state.patch.length = 0; state.validate = []; state.patchError = null; state.draftError = null; state.timeline = []; });

describe("detail forms write the server params", () => {
  it("delay until a day or time writes weekday numbers (Sunday = 0); units have no weeks", () => {
    const get = form(make("delay_until_time"));
    fireEvent.click(screen.getByLabelText("Mon"));
    fireEvent.click(screen.getByLabelText("Sun"));
    expect(params(get()).weekdays).toEqual([0, 1]);
    expect(screen.getAllByRole("checkbox").map((c) => c.parentElement!.textContent!.trim())).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    render(<NodeDetails node={make("delay_until_event")} onChange={vi.fn()} ctx={ctx} />);
    expect(optionTexts("Timeout unit")).toEqual(["minutes", "hours", "days"]);
  });

  it("internal notification: To is the owner or a staff user id, no subject", () => {
    const get = form(make("notify_staff_email"));
    expect(screen.queryByLabelText("Subject")).toBeNull();
    expect(optionTexts("To")).toEqual(["Contact owner", "Andrew P"]);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "u1" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "New lead {{first_name}}" } });
    expect(get()).toMatchObject({ action: "notify_staff", params: { channel: "email", to: "u1", message: "New lead {{first_name}}" } });
  });

  it("set contact property only offers the catalog's set_contact_field options", () => {
    const get = form(make("set_contact_field"));
    expect(optionTexts("Contact property")).toEqual(["Choose a property", "Lead status", "First name"]);
    fireEvent.change(screen.getByLabelText("Contact property"), { target: { value: "lead_status" } });
    fireEvent.change(screen.getByLabelText("New value"), { target: { value: "hot" } });
    expect(get()).toMatchObject({ action: "set_contact_field", params: { field: "lead_status", value: "hot" } });
  });

  it("set application stage writes stage", () => {
    const get = form(make("set_application_stage"));
    fireEvent.change(screen.getByLabelText("Application stage"), { target: { value: "Offer" } });
    expect(get()).toMatchObject({ action: "set_application_stage", params: { stage: "Offer" } });
  });

  it("send SMS writes kind with the label Message type", () => {
    const get = form(make("send_sms"));
    expect(screen.getByText("Message type")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message type"), { target: { value: "marketing" } });
    expect(params(get())).toMatchObject({ kind: "marketing" });
    expect(params(get())).not.toHaveProperty("purpose");
  });

  it("create task writes title, type, priority, dueInHours and assignee", () => {
    const get = form(make("create_task"));
    expect(optionTexts("Task type")).toEqual(["Call", "Email", "Text", "To-do"]);
    expect(optionTexts("Priority")).toEqual(["None", "Low", "Medium", "High"]);
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Call back" } });
    fireEvent.change(screen.getByLabelText("Task type"), { target: { value: "CALL" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "HIGH" } });
    fireEvent.change(screen.getByLabelText("Due in hours"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Assign to"), { target: { value: "u1" } });
    expect(params(get())).toEqual({ title: "Call back", type: "CALL", priority: "HIGH", dueInHours: 4, assignee: "u1" });
  });

  it("webhook picks includeFields from a checklist; https only; no free key/value list", () => {
    const get = form({ kind: "action", action: "webhook", params: { url: "", method: "POST", includeFields: [] }, next: null });
    expect(screen.queryByText("+ Add field")).toBeNull();
    fireEvent.change(screen.getByLabelText("Webhook address"), { target: { value: "http://x.example" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Use an https:// address.");
    fireEvent.click(within(screen.getByTestId("webhook-fields")).getByLabelText("Contact email"));
    fireEvent.click(within(screen.getByTestId("webhook-fields")).getByLabelText("Trigger type"));
    expect(params(get())).toEqual({ url: "http://x.example", method: "POST", includeFields: ["email", "trigger"] });
  });

  it("rotate owner with nobody ticked shows All active staff", () => {
    form(make("rotate_owner"));
    expect(screen.getByTestId("rotate-all")).toHaveTextContent("All active staff");
  });

  it("an email template with no body shows no preview", () => {
    form({ kind: "action", action: "send_email", params: { templateId: "t1" }, next: null });
    expect(screen.queryByTestId("email-preview")).toBeNull();
  });
});

describe("triggers", () => {
  it("date.relative and no_reply keep their params; filters use filterFields", () => {
    const onSave = vi.fn();
    render(<TriggerPanel catalog={catalog} triggers={[]} reenroll="never" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.click(within(screen.getByTestId("trigger-picker")).getByRole("button", { name: "A date is reached (days before/after)" }));
    fireEvent.change(screen.getByLabelText("Date field"), { target: { value: "created_at" } });
    fireEvent.change(screen.getByLabelText("Days after the date"), { target: { value: "-3" } });
    fireEvent.change(screen.getByLabelText("Trigger time"), { target: { value: "10:30" } });
    fireEvent.click(screen.getByText("+ Add condition"));
    expect(optionTexts("Property")).toEqual(["Choose a property", "Lead status"]);
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "lead_status" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "hot" } });
    fireEvent.click(screen.getByText("+ Add trigger"));
    fireEvent.click(within(screen.getByTestId("trigger-picker")).getByRole("button", { name: "No reply after a number of days" }));
    fireEvent.change(screen.getByLabelText("Days without a reply"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith([
      { type: "date.relative", filters: [{ field: "lead_status", op: "eq", value: "hot" }], filterLogic: "all", params: { field: "created_at", offsetDays: -3, time: "10:30" } },
      { type: "no_reply", filters: [], filterLogic: "all", params: { days: 5 } },
    ], "never");
  });
});

describe("settings", () => {
  it("quiet hours read Send only between start and end, default 09:00-20:00, never inverted; no silo picker", () => {
    let settings: Settings = { ...DEFAULT_SETTINGS };
    const ui = () => <SettingsTab catalog={catalog} silo="BI" settings={settings} goal={null} onChange={(c) => { settings = c.settings ?? settings; view.rerender(ui()); }} />;
    const view = render(ui());
    expect(screen.getByTestId("send-window")).toHaveTextContent("Send only between");
    expect(screen.getByLabelText("Send from")).toHaveValue("09:00");
    expect(screen.getByLabelText("Send until")).toHaveValue("20:00");
    fireEvent.change(screen.getByLabelText("Send from"), { target: { value: "08:00" } });
    expect(settings.quietHours).toEqual({ enabled: true, start: "08:00", end: "20:00", tz: "America/Edmonton" });
    expect(screen.queryByLabelText("Silo")).toBeNull();
    expect(screen.getByTestId("workflow-silo")).toHaveTextContent("BI - Boreal Insurance");
  });
});

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname}|{JSON.stringify(l.state ?? null)}</div>; }
type Entry = string | { pathname: string; state?: unknown };
function renderEditor(entry: Entry = "/automations/w1", wrap: (n: ReactNode) => ReactNode = (n) => n) {
  return render(<>{wrap(
    <MemoryRouter initialEntries={[entry]}>
      <Routes><Route path="/automations/:id" element={<WorkflowEditor />} /></Routes>
    </MemoryRouter>,
  )}</>);
}
const asRole = (role: string) => (n: ReactNode) => <AuthContext.Provider value={{ user: { role }, role } as never}>{n}</AuthContext.Provider>;
const card = (nodeId: string) => document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;

describe("editor", () => {
  it("Performance badges come from byNode entered and failed", async () => {
    renderEditor();
    await screen.findByText("Lead follow-up");
    fireEvent.click(screen.getByRole("tab", { name: "Performance" }));
    await waitFor(() => expect(within(card("n1")).getByTestId("step-count")).toHaveTextContent("5"));
    expect(within(card("n2")).getByTestId("step-count")).toHaveTextContent("0");
    expect(within(card("n3")).getByTestId("step-failed")).toHaveTextContent("2 failed");
  });

  it("History shows the label and highlights the path", async () => {
    renderEditor();
    await screen.findByText("Lead follow-up");
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    const row = await screen.findByTestId("history-row");
    expect(row).toHaveTextContent("Jane Doe");
    fireEvent.click(row);
    expect(screen.getByTestId("history-steps")).toHaveTextContent("Jane Doe: path through the workflow");
    expect(screen.getByTestId("history-steps")).toHaveTextContent("2. Delay - wait 1 days");
    await waitFor(() => expect(card("n1").style.border).toContain("var(--wf-highlight)"));
    expect(card("n2").style.border).toContain("var(--wf-highlight)");
    expect(card("n3").style.border).not.toContain("var(--wf-highlight)");
  });

  it("trigger issues show in Review issues and mark the trigger card", async () => {
    state.validate = [{ nodeId: "trigger:0", message: "a trigger filter needs a field and a valid operator" }];
    renderEditor();
    await waitFor(() => expect(screen.getByTestId("trigger-card")).toHaveAttribute("data-has-issues", "true"));
    expect(screen.getByTestId("trigger-changes-needed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Review issues \(1\)/ }));
    const item = within(screen.getByTestId("issues-panel")).getByTestId("issue-item");
    expect(item).toHaveTextContent("Enrollment trigger: A contact is created");
    expect(item).toHaveTextContent("a trigger filter needs a field and a valid operator");
    fireEvent.click(item);
    await waitFor(() => expect(screen.getByTestId("trigger-card")).toHaveClass("wf-card-flash"));
    expect(screen.getByTestId("trigger-issues")).toHaveTextContent("a trigger filter needs a field");
  });

  it("server error codes read as plain English with the issues; the role text only on 403", async () => {
    state.patchError = { status: 422, details: { error: { code: "fix_issues_before_enabling" }, issues: [{ nodeId: "n3", message: "the note needs text" }] } };
    renderEditor();
    await screen.findByText("Lead follow-up");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const msg = await screen.findByTestId("editor-message");
    expect(msg).toHaveTextContent("Fix the issues before turning this workflow on: the note needs text");
    expect(msg).not.toHaveTextContent("Only admins");
    await waitFor(() => expect(within(card("n3")).getByTestId("changes-needed")).toBeInTheDocument());
    state.patchError = { status: 403, details: { error: { code: "forbidden" } } };
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByTestId("editor-message")).toHaveTextContent("Only admins and marketing can change workflows."));
  });

  it("issues passed from the AI draft show in Review issues", async () => {
    renderEditor({ pathname: "/automations/w1", state: { issues: [{ nodeId: null, message: "the goal needs a condition" }] } });
    await screen.findByText("Lead follow-up");
    fireEvent.click(screen.getByRole("button", { name: /Review issues/ }));
    expect(screen.getByTestId("issues-panel")).toHaveTextContent("the goal needs a condition");
  });

  it("a new workflow takes the topbar silo and shows it read-only", async () => {
    renderEditor("/automations/new", (n) => <SiloContext.Provider value={{ silo: "bi", setSilo: vi.fn() }}>{n}</SiloContext.Provider>);
    expect(await screen.findByTestId("header-silo")).toHaveTextContent("BI");
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(screen.queryByLabelText("Silo")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.post.find(([u]) => u === "/api/automations")?.[1]).toMatchObject({ silo: "BI", enabled: false }));
  });

  it("Staff open it read-only: no +, no Save, no On/Off", async () => {
    renderEditor("/automations/w1", asRole("Staff"));
    await screen.findByText("Lead follow-up");
    await waitFor(() => expect(card("n1")).toBeTruthy());
    expect(screen.queryAllByTestId("plus-button")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Workflow on" })).toBeNull();
    expect(screen.getByTestId("read-only-badge")).toHaveTextContent("View only");
    expect(screen.getByTestId("workflow-status")).toHaveTextContent("Off");
    fireEvent.click(within(card("n1")).getByText("hot", { exact: false }));
    expect(screen.queryByTestId("side-panel")).toBeNull();
  });

  it("Admin and Marketing can edit and save", async () => {
    for (const role of ["Admin", "Marketing"]) {
      const view = renderEditor("/automations/w1", asRole(role));
      await screen.findByText("Lead follow-up");
      await waitFor(() => expect(screen.getAllByTestId("plus-button").length).toBeGreaterThan(0));
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Workflow on" })).toBeInTheDocument();
      view.unmount();
    }
  });
});

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/admin/automations"]}>
      <Routes>
        <Route path="/admin/automations" element={<AutomationsPage />} />
        <Route path="/automations/:id" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function askAi() {
  fireEvent.click(await screen.findByRole("button", { name: "Create workflow" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "With AI" }));
  fireEvent.change(screen.getByLabelText("Describe the workflow"), { target: { value: "Tag new leads" } });
  fireEvent.click(screen.getByRole("button", { name: "Draft workflow" }));
}

describe("With AI", () => {
  it("drafts, then creates it off in the current silo and opens it", async () => {
    renderList();
    await askAi();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/automations/w77"));
    const created = state.post.find(([u]) => u === "/api/automations")![1];
    expect(created).toMatchObject({ name: "Drafted", silo: "BF", enabled: false, goal: null });
    expect(created.graph.nodes.n1).toMatchObject({ id: "n1", action: "add_tag" });
    expect(state.post.map(([u]) => u)).toEqual(["/api/automations/draft-from-text", "/api/automations"]);
  });

  it("a 422 draft is still created and opened with its issues", async () => {
    state.draftError = { status: 422, details: { error: { code: "draft_invalid" }, issues: [{ nodeId: "n3", message: "the note needs text" }], draft: { name: "Half draft", graph: workflow.graph, settings: workflow.settings, goal: null } } };
    renderList();
    await askAi();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/automations/w77"));
    expect(screen.getByTestId("where")).toHaveTextContent("the note needs text");
    expect(state.post.find(([u]) => u === "/api/automations")![1]).toMatchObject({ name: "Half draft", enabled: false });
  });

  it("a failed draft shows the readable code message", async () => {
    state.draftError = { status: 503, details: { error: { code: "openai_not_configured" } } };
    renderList();
    await askAi();
    expect(await screen.findByRole("alert")).toHaveTextContent("AI drafting is not set up on the server");
    expect(state.post.some(([u]) => u === "/api/automations")).toBe(false);
  });
});

describe("contact timeline", () => {
  it("has no recording items and shows server automation items with the automation icon", async () => {
    expect(ITEM_KINDS.has("recording")).toBe(false);
    state.timeline = [
      { kind: "recording", id: "r1", ts: "2026-10-10T15:00:00Z", title: "Call recording", body: null, extra: "https://api.twilio.com/rec.mp3" },
      { kind: "system", id: "s1", ts: "2026-10-09T15:00:00Z", title: "Automation: Lead follow-up - Add tag", body: null, extra: null },
      { kind: "system", id: "s2", ts: "2026-10-08T15:00:00Z", title: "Contact merged", body: null, extra: null },
    ];
    render(<UnifiedTimeline contactId="c1" scope={{ kind: "contact", id: "c1" }} />);
    const auto = await screen.findByTestId("timeline-automation");
    expect(auto).toHaveTextContent("Automation: Lead follow-up - Add tag");
    expect(within(auto).getByTestId("automation-icon")).toBeInTheDocument();
    expect(screen.queryByText("Call recording")).toBeNull();
    expect(screen.queryByTestId("timeline-recording")).toBeNull();
    expect(screen.getByText("Contact merged")).toBeInTheDocument();
    expect(document.querySelectorAll("audio")).toHaveLength(0);
  });
});
