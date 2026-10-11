// BF_PORTAL_v786_WORKFLOW_BUILDER - graph helpers: insert at "+", delete step vs branch,
// move, layout of nested branches, and the one-line summaries.
import { describe, expect, it } from "vitest";
import { ACTIONS, searchActions } from "../actions";
import { COL, START, cloneAfter, deleteBranch, deleteStep, getPointer, insertAt, layoutGraph, missingParams, moveNode, numberNodes, summarize, triggerSummary } from "../graph";
import { normalizeCatalog } from "../workflowApi";
import type { Graph, WorkflowNode } from "../types";

const make = (key: string): WorkflowNode => ACTIONS.find((a) => a.key === key)!.make();
const empty = (): Graph => ({ triggers: [], startNodeId: null, nodes: {} });
const catalog = normalizeCatalog({
  fields: { lifecycle_stage: { label: "Lifecycle Stage", type: "select", options: [{ value: "lead", label: "Lead" }, { value: "customer", label: "Customer" }] }, score: { label: "Score", type: "number" } },
  triggers: [{ type: "contact.created", label: "Contact is created", group: "Contacts", filterFields: ["lifecycle_stage"] }],
  templates: { email: [{ id: "t1", name: "Welcome email", subject: "Welcome" }], sms: [] },
  events: [{ key: "email.opened", label: "Email is opened" }],
});

/** trigger -> a (task) -> b (branch: hi / None met) */
function sample(): Graph {
  let g = insertAt(empty(), START, "a", { kind: "action", action: "create_task", params: { title: "Call" }, next: null });
  g = insertAt(g, { parent: "a", port: "next" }, "b", { kind: "branch", branches: [{ id: "hi", label: ">= 70", logic: "all", conditions: [{ field: "score", op: "gte", value: "70" }], next: null }], noneNext: null });
  g = insertAt(g, { parent: "b", port: "branch:hi" }, "c", { kind: "action", action: "add_tag", params: { tag: "hot" }, next: null });
  g = insertAt(g, { parent: "b", port: "noneNext" }, "d", { kind: "action", action: "add_note", params: { body: "cold" }, next: null });
  return g;
}

describe("insert at +", () => {
  it("inserts above the rest of the path", () => {
    const g = insertAt(sample(), { parent: "a", port: "next" }, "x", make("delay_duration"));
    expect(getPointer(g, { parent: "a", port: "next" })).toBe("x");
    expect(getPointer(g, { parent: "x", port: "next" })).toBe("b");
  });
  it("hangs the rest of the path off None met when a branch is inserted", () => {
    const g = insertAt(sample(), START, "br", make("branch"));
    expect(g.startNodeId).toBe("br");
    expect(getPointer(g, { parent: "br", port: "noneNext" })).toBe("a");
  });
  it("refuses a Go to in the middle of a path", () => {
    expect(() => insertAt(sample(), START, "g", make("goto"))).toThrow(/last step/);
    expect(() => insertAt(sample(), { parent: "c", port: "next" }, "g", make("goto"))).not.toThrow();
  });
});

describe("delete", () => {
  it("delete step only keeps the main continuation", () => {
    const g = deleteStep(sample(), "a");
    expect(g.startNodeId).toBe("b");
    expect(g.nodes.a).toBeUndefined();
    const g2 = deleteStep(sample(), "b");
    expect(getPointer(g2, { parent: "a", port: "next" })).toBe("d");
    expect(g2.nodes.c).toBeUndefined();
    expect(g2.nodes.d).toBeDefined();
  });
  it("delete branch removes everything below", () => {
    const g = deleteBranch(sample(), "a");
    expect(g.startNodeId).toBeNull();
    expect(Object.keys(g.nodes)).toEqual([]);
  });
  it("clears Go to targets that were deleted", () => {
    let g = insertAt(sample(), { parent: "c", port: "next" }, "g", { kind: "goto", target: "d" });
    g = deleteBranch(g, "d");
    expect(g.nodes.g).toEqual({ id: "g", kind: "goto", target: "" });
    expect(missingParams(g.nodes.g!, g.nodes)).toEqual(["Choose the action to go to"]);
  });
});

describe("move and clone", () => {
  it("moves a step to another +", () => {
    const g = moveNode(sample(), "a", { parent: "b", port: "noneNext" });
    expect(g.startNodeId).toBe("b");
    expect(getPointer(g, { parent: "b", port: "noneNext" })).toBe("a");
    expect(getPointer(g, { parent: "a", port: "next" })).toBe("d");
  });
  it("refuses to move a branch inside itself", () => {
    expect(() => moveNode(sample(), "b", { parent: "c", port: "next" })).toThrow();
  });
  it("clones below itself", () => {
    const { graph, id } = cloneAfter(sample(), "a");
    expect(getPointer(graph, { parent: "a", port: "next" })).toBe(id);
    expect(getPointer(graph, { parent: id, port: "next" })).toBe("b");
    expect(numberNodes(graph)).toMatchObject({ a: 1, [id]: 2, b: 3 });
  });
});

describe("layout", () => {
  it("spreads nested branches left to right with labels and a + under each", () => {
    let g = sample();
    g = insertAt(g, { parent: "c", port: "next" }, "e", { kind: "branch", branches: [{ id: "y", label: "YES - 1", logic: "all", conditions: [], next: null }], noneNext: null });
    const layout = layoutGraph(g);
    expect(layout.columns).toBe(3);
    const labels = layout.items.filter((i) => i.type === "label").map((i) => (i as { label: string }).label);
    expect(labels).toEqual([">= 70", "YES - 1", "None met", "None met"]);
    const x = (id: string) => layout.items.find((i) => i.id === id)!.x;
    expect(x("node:a")).toBe(0);
    expect(x("node:c")).toBe(-COL / 2);
    expect(x("node:d")).toBe(COL);
    expect(x("label:e|branch:y")).toBe(-COL);
    expect(x("label:e|noneNext")).toBe(0);
    // one + per connector (start, a.next, two under b, c.next, two under e, d.next)
    expect(layout.items.filter((i) => i.type === "plus")).toHaveLength(8);
    expect(layout.items.filter((i) => i.type === "end")).toHaveLength(3);
    const y = (id: string) => layout.items.find((i) => i.id === id)!.y;
    expect(y("node:c")).toBeGreaterThan(y("node:b"));
    expect(y("node:c")).toBe(y("node:d"));
  });
  it("until_event delays show two exits", () => {
    const g = insertAt(empty(), START, "w", make("delay_until_event"));
    const labels = layoutGraph(g).items.filter((i) => i.type === "label").map((i) => (i as { label: string }).label);
    expect(labels).toEqual(["Event happened", "Timed out"]);
  });
});

describe("summaries", () => {
  it("describes each step in plain English", () => {
    expect(summarize({ kind: "action", action: "set_contact_field", params: { field: "lifecycle_stage", value: "lead" }, next: null }, { catalog })).toBe("Set Lifecycle Stage to Lead");
    expect(summarize({ kind: "action", action: "send_email", params: { templateId: "t1" }, next: null }, { catalog })).toBe("Send email: Welcome email");
    expect(summarize({ kind: "delay", mode: "duration", params: { amount: 2, unit: "days" }, next: null })).toBe("Delay 2 days");
    expect(summarize({ kind: "delay", mode: "duration", params: { amount: 1, unit: "hours" }, next: null })).toBe("Delay 1 hour");
    expect(summarize({ kind: "delay", mode: "until_event", params: { event: "email.opened", timeoutAmount: 3, timeoutUnit: "days" }, next: null }, { catalog })).toBe("Delay until Email is opened (up to 3 days)");
    expect(summarize({ kind: "goto", target: "b" }, { numbers: { b: 2 }, nodes: sample().nodes })).toBe("Go to 2. If/then branch");
    expect(triggerSummary([{ type: "contact.created", filters: [{ field: "lifecycle_stage", op: "eq", value: "lead" }], filterLogic: "all" }], catalog)).toBe("Contact is created and Lifecycle Stage is Lead");
  });
  it("flags missing required params", () => {
    expect(missingParams(make("send_email"))).toEqual(["Choose an email template"]);
    expect(missingParams(make("webhook"))).toEqual(["Enter an https:// address"]);
    expect(missingParams({ kind: "action", action: "webhook", params: { url: "https://x.example/hook" }, next: null })).toEqual([]);
    expect(missingParams(make("delay_duration"))).toEqual([]);
  });
  it("searches the action list", () => {
    expect(searchActions("sms").map((a) => a.key)).toEqual(["notify_staff_sms", "send_sms"]);
    expect(searchActions("delay")).toHaveLength(3);
  });
});
