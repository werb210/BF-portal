// BF_PORTAL_v786_WORKFLOW_BUILDER - pure helpers over the workflow graph: read and write the
// pointer behind a "+", insert / delete / move / clone steps, number the cards, lay the tree
// out top-down, and describe each step in one line of plain English.
import { ACTIONS, defOf, newId } from "./actions";
import type { Catalog, Condition, Graph, ListRef, Slot, Trigger, UserRef, WorkflowNode, WorkflowRef } from "./types";

export const START: Slot = { parent: "trigger", port: "start" };
export const slotKey = (slot: Slot): string => slot.parent + "|" + slot.port;

/** The node id a "+" currently points at (null = end of the path). */
export function getPointer(graph: Graph, slot: Slot): string | null {
  if (slot.parent === "trigger") return graph.startNodeId;
  const node = graph.nodes[slot.parent];
  if (!node) return null;
  const [kind, id] = splitPort(slot.port);
  switch (node.kind) {
    case "action": return kind === "next" ? node.next : null;
    case "delay": return kind === "next" ? node.next : kind === "timeoutNext" ? node.timeoutNext ?? null : null;
    case "branch": return kind === "noneNext" ? node.noneNext : kind === "branch" ? node.branches.find((b) => b.id === id)?.next ?? null : null;
    case "value_branch": return kind === "noneNext" ? node.noneNext : kind === "case" ? node.cases.find((c) => c.id === id)?.next ?? null : null;
    default: return null;
  }
}

function splitPort(port: string): [string, string] {
  const i = port.indexOf(":");
  return i === -1 ? [port, ""] : [port.slice(0, i), port.slice(i + 1)];
}

/** Returns a copy of the graph with the pointer behind `slot` set to `target`. */
export function setPointer(graph: Graph, slot: Slot, target: string | null): Graph {
  if (slot.parent === "trigger") return { ...graph, startNodeId: target };
  const node = graph.nodes[slot.parent];
  if (!node) return graph;
  const [kind, id] = splitPort(slot.port);
  let next: WorkflowNode = node;
  if (node.kind === "action" && kind === "next") next = { ...node, next: target };
  else if (node.kind === "delay" && kind === "next") next = { ...node, next: target };
  else if (node.kind === "delay" && kind === "timeoutNext") next = { ...node, timeoutNext: target };
  else if ((node.kind === "branch" || node.kind === "value_branch") && kind === "noneNext") next = { ...node, noneNext: target };
  else if (node.kind === "branch" && kind === "branch") next = { ...node, branches: node.branches.map((b) => b.id === id ? { ...b, next: target } : b) };
  else if (node.kind === "value_branch" && kind === "case") next = { ...node, cases: node.cases.map((c) => c.id === id ? { ...c, next: target } : c) };
  return { ...graph, nodes: { ...graph.nodes, [slot.parent]: next } };
}

/** The port the rest of the path hangs off when a node is inserted above it. */
export function continuationPort(node: WorkflowNode): string | null {
  switch (node.kind) {
    case "action":
    case "delay": return "next";
    case "branch":
    case "value_branch": return "noneNext";
    default: return null;
  }
}

export type Exit = { port: string; label: string | null; target: string | null };

/** Every way out of a node, in display order (left to right). */
export function exitsOf(node: WorkflowNode): Exit[] {
  switch (node.kind) {
    case "action": return [{ port: "next", label: null, target: node.next }];
    case "delay": return node.mode === "until_event"
      ? [{ port: "next", label: "Event happened", target: node.next }, { port: "timeoutNext", label: "Timed out", target: node.timeoutNext ?? null }]
      : [{ port: "next", label: null, target: node.next }];
    case "branch": return [...node.branches.map((b, i) => ({ port: "branch:" + b.id, label: b.label || "Branch " + (i + 1), target: b.next })), { port: "noneNext", label: "None met", target: node.noneNext }];
    case "value_branch": return [...node.cases.map((c) => ({ port: "case:" + c.id, label: c.label || c.value || "(empty)", target: c.next })), { port: "noneNext", label: "None met", target: node.noneNext }];
    default: return [];
  }
}

/** Ids of `id` and everything below it (goto targets are references, not children). */
export function subtreeIds(graph: Graph, id: string | null): Set<string> {
  const out = new Set<string>();
  const walk = (cur: string | null) => {
    if (!cur || out.has(cur) || !graph.nodes[cur]) return;
    out.add(cur);
    for (const exit of exitsOf(graph.nodes[cur]!)) walk(exit.target);
  };
  walk(id);
  return out;
}

export function findParentSlot(graph: Graph, id: string): Slot | null {
  if (graph.startNodeId === id) return START;
  for (const [parent, node] of Object.entries(graph.nodes)) {
    for (const exit of exitsOf(node)) if (exit.target === id) return { parent, port: exit.port };
  }
  return null;
}

export class GraphError extends Error {}

/** Insert `node` (as `id`) at a "+": the rest of the path moves under the new node. */
export function insertAt(graph: Graph, slot: Slot, id: string, node: WorkflowNode): Graph {
  const rest = getPointer(graph, slot);
  const port = continuationPort(node);
  if (!port && rest) throw new GraphError("Go to other action can only be the last step on a path.");
  let placed: Graph = { ...graph, nodes: { ...graph.nodes, [id]: node } };
  if (port) placed = setPointer(placed, { parent: id, port }, rest);
  return setPointer(placed, slot, id);
}

function withoutNodes(graph: Graph, ids: Set<string>): Graph {
  const nodes: Record<string, WorkflowNode> = {};
  for (const [key, node] of Object.entries(graph.nodes)) {
    if (ids.has(key)) continue;
    // A Go to whose target is gone keeps its card but needs a new target.
    nodes[key] = node.kind === "goto" && ids.has(node.target) ? { ...node, target: "" } : node;
  }
  return { ...graph, nodes, startNodeId: graph.startNodeId && ids.has(graph.startNodeId) ? null : graph.startNodeId };
}

/** Delete only this step: its main continuation (next / None met) takes its place; other exits go. */
export function deleteStep(graph: Graph, id: string): Graph {
  const node = graph.nodes[id];
  if (!node) return graph;
  const port = continuationPort(node);
  const keep = port ? getPointer(graph, { parent: id, port }) : null;
  const parent = findParentSlot(graph, id);
  let out = parent ? setPointer(graph, parent, keep) : graph;
  const gone = new Set<string>([id]);
  for (const exit of exitsOf(node)) if (exit.target && exit.target !== keep) for (const x of subtreeIds(out, exit.target)) gone.add(x);
  out = withoutNodes(out, gone);
  return out;
}

/** Delete this step and every step below it. */
export function deleteBranch(graph: Graph, id: string): Graph {
  const parent = findParentSlot(graph, id);
  const gone = subtreeIds(graph, id);
  const out = parent ? setPointer(graph, parent, null) : graph;
  return withoutNodes(out, gone);
}

/** Move a step (with any branches below it) to another "+". */
export function moveNode(graph: Graph, id: string, slot: Slot): Graph {
  const node = graph.nodes[id];
  if (!node) return graph;
  if (slot.parent === id) return graph;
  const port = continuationPort(node);
  const keep = port ? getPointer(graph, { parent: id, port }) : null;
  const parent = findParentSlot(graph, id);
  let detached = parent ? setPointer(graph, parent, keep) : graph;
  if (port) detached = setPointer(detached, { parent: id, port }, null);
  if (subtreeIds(detached, id).has(slot.parent)) throw new GraphError("A step can't move inside its own branches.");
  const placed = detached.nodes[id]!;
  const rest = { ...detached, nodes: { ...detached.nodes } };
  delete rest.nodes[id];
  if (rest.startNodeId === id) rest.startNodeId = null;
  return insertAt(rest, slot, id, placed);
}

/** A fresh copy of one node: new branch ids, every exit empty. */
export function detachedCopy(node: WorkflowNode): WorkflowNode {
  const clone = JSON.parse(JSON.stringify(node)) as WorkflowNode;
  switch (clone.kind) {
    case "action": return { ...clone, next: null };
    case "delay": return clone.mode === "until_event" ? { ...clone, next: null, timeoutNext: null } : { ...clone, next: null };
    case "branch": return { ...clone, noneNext: null, branches: clone.branches.map((b) => ({ ...b, id: newId("b"), next: null })) };
    case "value_branch": return { ...clone, noneNext: null, cases: clone.cases.map((c) => ({ ...c, id: newId("c"), next: null })) };
    default: return clone;
  }
}

/** Clone a step directly below itself. Returns the graph and the new id. */
export function cloneAfter(graph: Graph, id: string): { graph: Graph; id: string } {
  const node = graph.nodes[id];
  if (!node) return { graph, id };
  const port = continuationPort(node);
  if (!port) throw new GraphError("Nothing can follow a Go to step.");
  const copyId = newId();
  return { graph: insertAt(graph, { parent: id, port }, copyId, detachedCopy(node)), id: copyId };
}

/** Card numbers in reading order (pre-order, left branch first). */
export function numberNodes(graph: Graph): Record<string, number> {
  const out: Record<string, number> = {};
  let n = 0;
  const walk = (id: string | null) => {
    if (!id || out[id] !== undefined || !graph.nodes[id]) return;
    out[id] = ++n;
    for (const exit of exitsOf(graph.nodes[id]!)) walk(exit.target);
  };
  walk(graph.startNodeId);
  return out;
}

// ---- layout -----------------------------------------------------------------

export const COL = 320;
export const CARD_W = 280;
export const CARD_H = 132;
export const TRIGGER_W = 300;
export const TRIGGER_H = 140;
export const PLUS = 28;
export const LABEL_W = 150;
export const LABEL_H = 30;
export const END_W = 80;
export const END_H = 28;
const GAP = 22;

export type LayoutItem =
  | { id: string; type: "trigger"; x: number; y: number }
  | { id: string; type: "step"; x: number; y: number; nodeId: string }
  | { id: string; type: "plus"; x: number; y: number; slot: Slot }
  | { id: string; type: "label"; x: number; y: number; label: string; slot: Slot }
  | { id: string; type: "end"; x: number; y: number };
export type LayoutEdge = { id: string; source: string; target: string };
export type Layout = { items: LayoutItem[]; edges: LayoutEdge[]; columns: number; height: number };

/**
 * Top-down tree layout. Every path is one column wide; a branching node spreads its exits
 * left-to-right, each taking as many columns as its own subtree needs. `x` is the centre.
 */
export function layoutGraph(graph: Graph): Layout {
  const items: LayoutItem[] = [];
  const edges: LayoutEdge[] = [];
  const widths = new Map<string, number>();
  const visiting = new Set<string>();
  const width = (id: string | null): number => {
    if (!id || !graph.nodes[id] || visiting.has(id)) return 1;
    const known = widths.get(id);
    if (known) return known;
    visiting.add(id);
    const exits = exitsOf(graph.nodes[id]!);
    const w = exits.length === 0 ? 1 : exits.length === 1 ? width(exits[0]!.target) : exits.reduce((sum, e) => sum + width(e.target), 0);
    visiting.delete(id);
    widths.set(id, w);
    return w;
  };
  let bottom = 0;
  const placed = new Set<string>();
  const edge = (source: string, target: string) => edges.push({ id: source + "->" + target, source, target });

  const place = (ptr: string | null, slot: Slot, cx: number, y: number, from: string) => {
    const plusId = "plus:" + slotKey(slot);
    items.push({ id: plusId, type: "plus", x: cx, y, slot });
    edge(from, plusId);
    let top = y + PLUS + GAP;
    const node = ptr ? graph.nodes[ptr] : undefined;
    if (!ptr || !node || placed.has(ptr)) {
      const endId = "end:" + slotKey(slot);
      items.push({ id: endId, type: "end", x: cx, y: top });
      edge(plusId, endId);
      bottom = Math.max(bottom, top + END_H);
      return;
    }
    placed.add(ptr);
    const cardId = "node:" + ptr;
    items.push({ id: cardId, type: "step", x: cx, y: top, nodeId: ptr });
    edge(plusId, cardId);
    top += CARD_H + GAP;
    bottom = Math.max(bottom, top);
    const exits = exitsOf(node);
    if (exits.length === 0) return;
    if (exits.length === 1 && exits[0]!.label === null) {
      place(exits[0]!.target, { parent: ptr, port: exits[0]!.port }, cx, top, cardId);
      return;
    }
    const total = exits.reduce((sum, e) => sum + width(e.target), 0);
    let left = cx - (total * COL) / 2;
    for (const exit of exits) {
      const w = width(exit.target);
      const ecx = left + (w * COL) / 2;
      const exitSlot = { parent: ptr, port: exit.port };
      const labelId = "label:" + slotKey(exitSlot);
      items.push({ id: labelId, type: "label", x: ecx, y: top, label: exit.label ?? "", slot: exitSlot });
      edge(cardId, labelId);
      place(exit.target, exitSlot, ecx, top + LABEL_H + GAP, labelId);
      left += w * COL;
    }
  };

  items.push({ id: "trigger", type: "trigger", x: 0, y: 0 });
  place(graph.startNodeId, START, 0, TRIGGER_H + GAP, "trigger");
  return { items, edges, columns: width(graph.startNodeId), height: bottom };
}

// ---- plain-English text ---------------------------------------------------------

export const OP_LABEL: Record<string, string> = {
  eq: "is", neq: "is not", in: "is any of", not_in: "is none of", gt: "is more than", gte: "is at least", lt: "is less than", lte: "is at most",
  contains: "contains", not_contains: "does not contain", is_set: "is known", is_not_set: "is unknown", changed: "changed", before: "is before", after: "is after",
};
export const NO_VALUE_OPS = new Set(["is_set", "is_not_set", "changed"]);

export type SummaryContext = {
  catalog?: Catalog | null;
  lists?: ListRef[];
  users?: UserRef[];
  workflows?: WorkflowRef[];
  numbers?: Record<string, number>;
  nodes?: Record<string, WorkflowNode>;
};

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v)).trim();
const plural = (n: number, unit: string) => {
  const one = unit.replace(/s$/, "");
  return n + " " + (n === 1 ? one : one + "s");
};
const clip = (text: string, max = 40) => (text.length > max ? text.slice(0, max - 3) + "..." : text);

export function fieldLabel(key: string, catalog?: Catalog | null): string {
  return catalog?.fields.find((f) => f.key === key)?.label ?? key;
}

function valueLabel(fieldKey: string, value: string, catalog?: Catalog | null): string {
  return catalog?.fields.find((f) => f.key === fieldKey)?.options.find((o) => o.value === value)?.label ?? value;
}

export function describeCondition(c: Condition, catalog?: Catalog | null): string {
  const op = OP_LABEL[c.op] ?? c.op;
  const field = c.field ? fieldLabel(c.field, catalog) : "(choose a property)";
  return NO_VALUE_OPS.has(c.op) ? field + " " + op : field + " " + op + " " + (str(c.value) ? valueLabel(c.field, str(c.value), catalog) : "(no value)");
}

export function describeConditions(conditions: Condition[], logic: "all" | "any", catalog?: Catalog | null): string {
  return conditions.map((c) => describeCondition(c, catalog)).join(logic === "any" ? " or " : " and ");
}

const WEEKDAY: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

/** One line describing what a step does, e.g. "Set Lifecycle Stage to Lead". */
export function summarize(node: WorkflowNode, ctx: SummaryContext = {}): string {
  const { catalog } = ctx;
  if (node.kind === "delay") {
    const p = node.params;
    if (node.mode === "duration") return Number(p.amount) > 0 ? "Delay " + plural(Number(p.amount), str(p.unit) || "days") : "Delay: set how long";
    if (node.mode === "until_time") {
      const days = Array.isArray(p.weekdays) ? (p.weekdays as string[]).map((d) => WEEKDAY[d] ?? d) : [];
      return "Delay until " + (str(p.time) || "a time") + (days.length ? " on " + days.join(", ") : "");
    }
    const event = catalog?.events.find((e) => e.key === str(p.event))?.label ?? (str(p.event) || "an event");
    return "Delay until " + event + (Number(p.timeoutAmount) > 0 ? " (up to " + plural(Number(p.timeoutAmount), str(p.timeoutUnit) || "days") + ")" : "");
  }
  if (node.kind === "branch") return "If/then branch: " + plural(node.branches.length, "branches") + " and None met";
  if (node.kind === "value_branch") return node.field ? "Value branch on " + fieldLabel(node.field, catalog) : "Value branch: choose a property";
  if (node.kind === "goto") {
    if (!node.target) return "Go to: choose an action";
    const n = ctx.numbers?.[node.target];
    const target = ctx.nodes?.[node.target];
    return "Go to " + (n ? n + ". " : "") + (target ? defOf(target)?.title ?? "step" : "step");
  }
  const p = node.params;
  switch (node.action) {
    case "send_email": {
      const t = catalog?.templates.email.find((x) => x.id === str(p.templateId));
      return "Send email: " + (t?.name ?? (str(p.templateId) ? str(p.templateId) : "choose a template"));
    }
    case "send_sms": {
      const t = catalog?.templates.sms.find((x) => x.id === str(p.templateId));
      if (t) return "Send SMS: " + t.name;
      return str(p.body) ? "Send SMS: \"" + clip(str(p.body)) + "\"" : "Send SMS: write the message";
    }
    case "notify_client": return "Notify client: " + (str(p.title) || clip(str(p.body)) || "write the message");
    case "internal_email": return "Email " + who(p, ctx) + ": " + (str(p.subject) || "add a subject");
    case "internal_sms": return "Text " + who(p, ctx) + (str(p.body) ? ": \"" + clip(str(p.body)) + "\"" : "");
    case "in_app_notification": return "Notify " + who(p, ctx) + " in the app";
    case "team_post": return "Post to Team chat" + (str(p.channel) ? " #" + str(p.channel) : "");
    case "rotate_owner": {
      const n = Array.isArray(p.userIds) ? p.userIds.length : 0;
      return n ? "Rotate owner between " + plural(n, "people") : "Rotate owner: choose people";
    }
    case "assign_owner": return "Assign owner: " + (userName(str(p.userId), ctx) || "choose a person");
    case "create_task": return "Create task: " + (str(p.title) || "add a title");
    case "add_note": return str(p.body) ? "Add note: \"" + clip(str(p.body)) + "\"" : "Add note";
    case "set_property": return str(p.field) ? "Set " + fieldLabel(str(p.field), catalog) + " to " + (str(p.value) ? valueLabel(str(p.field), str(p.value), catalog) : "(empty)") : "Set a contact property";
    case "set_stage": return "Set application stage to " + (str(p.stage) || "(choose a stage)");
    case "add_tag": return "Add tag \"" + (str(p.tag) || "?") + "\"";
    case "remove_tag": return "Remove tag \"" + (str(p.tag) || "?") + "\"";
    case "add_to_list": return "Add to list: " + (ctx.lists?.find((l) => l.id === str(p.listId))?.name ?? (str(p.listId) || "choose a list"));
    case "remove_from_list": return "Remove from list: " + (ctx.lists?.find((l) => l.id === str(p.listId))?.name ?? (str(p.listId) || "choose a list"));
    case "enroll_workflow": return "Enroll in workflow: " + (ctx.workflows?.find((w) => w.id === str(p.workflowId))?.name ?? (str(p.workflowId) || "choose a workflow"));
    case "webhook": {
      const url = str(p.url);
      let host = url;
      try { host = url ? new URL(url).host : ""; } catch { /* keep raw */ }
      return "Trigger webhook" + (host ? ": " + host : "");
    }
    default: return ACTIONS.find((a) => a.key === node.action)?.label ?? node.action;
  }
}

function userName(id: string, ctx: SummaryContext): string {
  return id ? ctx.users?.find((u) => u.id === id)?.name ?? id : "";
}

function who(p: Record<string, unknown>, ctx: SummaryContext): string {
  return str(p.to) === "user" ? userName(str(p.userId), ctx) || "a person" : "the owner";
}

/** What still has to be filled in before the server will run this step. Empty = ready. */
export function missingParams(node: WorkflowNode, nodes: Record<string, WorkflowNode> = {}): string[] {
  const out: string[] = [];
  if (node.kind === "delay") {
    const p = node.params;
    if (node.mode === "duration" && !(Number(p.amount) > 0)) out.push("Set how long to wait");
    if (node.mode === "until_time" && !/^\d{1,2}:\d{2}$/.test(str(p.time))) out.push("Choose a time of day");
    if (node.mode === "until_event") {
      if (!str(p.event)) out.push("Choose the event");
      if (!(Number(p.timeoutAmount) > 0)) out.push("Set how long to wait before timing out");
    }
    return out;
  }
  if (node.kind === "branch") {
    if (node.branches.length === 0) out.push("Add a branch");
    node.branches.forEach((b, i) => {
      if (b.conditions.length === 0 || b.conditions.some((c) => !c.field || (!NO_VALUE_OPS.has(c.op) && !str(c.value)))) out.push("Finish the conditions for " + (b.label || "branch " + (i + 1)));
    });
    return out;
  }
  if (node.kind === "value_branch") {
    if (!node.field) out.push("Choose a property");
    if (node.cases.length === 0) out.push("Add at least one value");
    return out;
  }
  if (node.kind === "goto") {
    if (!node.target || !nodes[node.target]) out.push("Choose the action to go to");
    return out;
  }
  const p = node.params;
  const need = (key: string, message: string) => { if (!str(p[key])) out.push(message); };
  switch (node.action) {
    case "send_email": need("templateId", "Choose an email template"); break;
    case "send_sms": if (!str(p.templateId) && !str(p.body)) out.push("Choose a template or write the message"); break;
    case "notify_client": need("body", "Write the message"); break;
    case "internal_email": need("subject", "Add a subject"); need("body", "Write the message"); if (str(p.to) === "user") need("userId", "Choose who gets it"); break;
    case "internal_sms":
    case "in_app_notification": need("body", "Write the message"); if (str(p.to) === "user") need("userId", "Choose who gets it"); break;
    case "team_post": need("channel", "Name the channel"); need("body", "Write the message"); break;
    case "rotate_owner": if (!Array.isArray(p.userIds) || p.userIds.length === 0) out.push("Choose who to rotate between"); break;
    case "assign_owner": need("userId", "Choose the owner"); break;
    case "create_task": need("title", "Give the task a title"); if (str(p.assignTo) === "user") need("userId", "Choose who gets the task"); break;
    case "add_note": need("body", "Write the note"); break;
    case "set_property": need("field", "Choose a property"); break;
    case "set_stage": need("stage", "Choose a stage"); break;
    case "add_tag":
    case "remove_tag": need("tag", "Choose a tag"); break;
    case "add_to_list":
    case "remove_from_list": need("listId", "Choose a list"); break;
    case "enroll_workflow": need("workflowId", "Choose a workflow"); break;
    case "webhook": if (!/^https:\/\/[^\s]+$/i.test(str(p.url))) out.push("Enter an https:// address"); break;
    default: break;
  }
  return out;
}

export function triggerSummary(triggers: Trigger[], catalog?: Catalog | null): string {
  if (triggers.length === 0) return "Choose what starts this workflow";
  return triggers.map((t) => {
    const label = catalog?.triggers.find((x) => x.key === t.type)?.label ?? t.type;
    const filters = t.filters.filter((f) => f.field);
    return label + (filters.length ? " and " + describeConditions(filters, t.filterLogic, catalog) : "");
  }).join("; or ");
}
