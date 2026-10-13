// BF_PORTAL_v786_WORKFLOW_BUILDER - pure helpers over the workflow graph: read and write the
// pointer behind a "+", insert / delete / move / clone steps, number the cards, lay the tree
// out top-down, and describe each step in one line of plain English.
// BF_PORTAL_v787_BUILDER_FIXES - nodes carry id === key (insert, copy, clone, paste), weekdays are
// numbers 0-6 with Sunday = 0, delays use minutes/hours/days only, and workflows saved by the v786
// builder (internal_email, set_property, purpose, taskType, weeks, "mon"...) are converted to the
// BF-Server ACTION_TYPES form when they load.
import { DEFAULT_WEBHOOK_FIELDS, WEBHOOK_FIELDS, defOf, newId } from "./actions";
import type { Catalog, Condition, Graph, Issue, ListRef, Slot, Trigger, UserRef, WorkflowNode, WorkflowRef } from "./types";

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
  let placed: Graph = { ...graph, nodes: { ...graph.nodes, [id]: { ...node, id } } };
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

/**
 * Copies of the nodes `ids` under fresh ids (each copy's id equals its new key). Links between
 * copied nodes (next, noneNext, timeoutNext, branch and case next, goto target) point at the
 * copies; links leaving the set are cleared, except a goto target, which is a reference and is kept.
 */
export function copyNodes(nodes: Record<string, WorkflowNode>, ids: string[]): { nodes: Record<string, WorkflowNode>; idMap: Record<string, string> } {
  const idMap: Record<string, string> = {};
  for (const id of ids) if (nodes[id]) idMap[id] = newId();
  const link = (target: string | null | undefined) => (target && idMap[target] ? idMap[target]! : null);
  const out: Record<string, WorkflowNode> = {};
  for (const [oldId, id] of Object.entries(idMap)) {
    const clone = JSON.parse(JSON.stringify(nodes[oldId])) as WorkflowNode;
    let copy: WorkflowNode;
    switch (clone.kind) {
      case "action": copy = { ...clone, next: link(clone.next) }; break;
      case "delay": copy = clone.mode === "until_event" ? { ...clone, next: link(clone.next), timeoutNext: link(clone.timeoutNext) } : { ...clone, next: link(clone.next) }; break;
      case "branch": copy = { ...clone, noneNext: link(clone.noneNext), branches: clone.branches.map((b) => ({ ...b, id: newId("b"), next: link(b.next) })) }; break;
      case "value_branch": copy = { ...clone, noneNext: link(clone.noneNext), cases: clone.cases.map((c) => ({ ...c, id: newId("c"), next: link(c.next) })) }; break;
      default: copy = { ...clone, target: idMap[clone.target] ?? clone.target };
    }
    out[id] = { ...copy, id };
  }
  return { nodes: out, idMap };
}

/** A fresh copy of one node: a new id, new branch ids, every exit empty. */
export function detachedCopy(node: WorkflowNode): WorkflowNode {
  return Object.values(copyNodes({ copy: node }, ["copy"]).nodes)[0]!;
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

/** Weekday names by server number (0 = Sunday). */
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Display order Mon..Sun as [number, label]. */
export const WEEKDAYS_DISPLAY: Array<[number, string]> = [1, 2, 3, 4, 5, 6, 0].map((n) => [n, WEEKDAY_NAMES[n]!]);
export const DELAY_UNITS = ["minutes", "hours", "days"] as const;
export const STAFF_CHANNEL_LABEL: Record<string, string> = { email: "Email", sms: "Text", in_app: "Notify", team: "Post to Team chat for" };

/** One line describing what a step does, e.g. "Set Lifecycle Stage to Lead". */
export function summarize(node: WorkflowNode, ctx: SummaryContext = {}): string {
  const { catalog } = ctx;
  if (node.kind === "delay") {
    const p = node.params;
    if (node.mode === "duration") return Number(p.amount) > 0 ? "Delay " + plural(Number(p.amount), str(p.unit) || "days") : "Delay: set how long";
    if (node.mode === "until_time") {
      const days = Array.isArray(p.weekdays) ? [...(p.weekdays as number[])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_NAMES[d] ?? String(d)) : [];
      return "Delay until " + (str(p.time) || "a time") + (days.length ? " on " + days.join(", ") : "");
    }
    const event = catalog?.events.find((e) => e.key === str(p.event))?.label ?? (str(p.event) || "an event");
    return "Delay until " + event + (Number(p.timeoutAmount) > 0 ? " (up to " + plural(Number(p.timeoutAmount), str(p.timeoutUnit) || "days") + ")" : "");
  }
  if (node.kind === "branch") return "If/then branch: " + node.branches.length + (node.branches.length === 1 ? " branch" : " branches") + " and None met"; // BF_PORTAL_v796_BUILDER_WORDING
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
    case "notify_staff": {
      const channel = str(p.channel) || "in_app";
      if (channel === "team") return "Post staff notice to Team chat" + (str(p.message) ? ": \"" + clip(str(p.message)) + "\"" : "");
      return (STAFF_CHANNEL_LABEL[channel] ?? "Notify") + " " + who(p, ctx) + (channel === "in_app" ? " in the app" : "") + (str(p.message) ? ": \"" + clip(str(p.message)) + "\"" : "");
    }
    case "team_post": return "Post to Team chat" + (str(p.channel) ? " #" + str(p.channel) : "");
    case "rotate_owner": {
      const n = Array.isArray(p.userIds) ? p.userIds.length : 0;
      return n ? "Rotate owner between " + plural(n, "people") : "Rotate owner between all active staff";
    }
    case "assign_owner": return "Assign owner: " + (userName(str(p.userId), ctx) || "choose a person");
    case "create_task": return "Create task: " + (str(p.title) || "add a title");
    case "add_note": return str(p.body) ? "Add note: \"" + clip(str(p.body)) + "\"" : "Add note";
    case "set_contact_field": return str(p.field) ? "Set " + fieldLabel(str(p.field), catalog) + " to " + (str(p.value) ? valueLabel(str(p.field), str(p.value), catalog) : "(empty)") : "Set a contact property";
    case "set_application_stage": return "Set application stage to " + (str(p.stage) || "(choose a stage)");
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
    default: return defOf(node)?.label ?? node.action;
  }
}

function userName(id: string, ctx: SummaryContext): string {
  return id ? ctx.users?.find((u) => u.id === id)?.name ?? id : "";
}

function who(p: Record<string, unknown>, ctx: SummaryContext): string {
  const to = str(p.to);
  return !to || to === "owner" ? "the owner" : userName(to, ctx) || "a person";
}

/** What still has to be filled in before the server will run this step. Empty = ready. */
export function missingParams(node: WorkflowNode, nodes: Record<string, WorkflowNode> = {}): string[] {
  const out: string[] = [];
  if (node.kind === "delay") {
    const p = node.params;
    if (node.mode === "duration" && !(Number(p.amount) > 0)) out.push("Set how long to wait");
    if (node.mode === "until_time" && !/^\d{2}:\d{2}$/.test(str(p.time))) out.push("Choose a time of day");
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
    case "notify_staff": need("message", "Write the message"); if (str(p.channel) !== "team") need("to", "Choose who gets it"); break;
    case "team_post": need("channel", "Name the channel"); need("body", "Write the message"); break;
    // rotate_owner with nobody chosen rotates between all active staff (BF-Server graph.ts).
    case "assign_owner": need("userId", "Choose the owner"); break;
    case "create_task": need("title", "Give the task a title"); break;
    case "add_note": need("body", "Write the note"); break;
    case "set_contact_field": need("field", "Choose a property"); break;
    case "set_application_stage": need("stage", "Choose a stage"); break;
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
    const label = catalog?.triggers.find((x) => x.type === t.type)?.label ?? t.type;
    const filters = t.filters.filter((f) => f.field);
    return label + (filters.length ? " and " + describeConditions(filters, t.filterLogic, catalog) : "");
  }).join("; or ");
}

/** Trigger problems, keyed like the server: nodeId "trigger:<index>". */
export function triggerIssues(triggers: Trigger[]): Issue[] {
  const out: Issue[] = [];
  triggers.forEach((t, i) => {
    if (t.type === "date.relative" && !str(t.params?.field)) out.push({ nodeId: "trigger:" + i, message: "Choose the date field" });
    if (t.type === "no_reply" && !(Number(t.params?.days) >= 1)) out.push({ nodeId: "trigger:" + i, message: "Set how many days without a reply" });
    if (t.filters.some((f) => !f.field)) out.push({ nodeId: "trigger:" + i, message: "Finish or remove the empty filter" });
  });
  return out;
}

// ---- v786 -> server form ------------------------------------------------------------

const OLD_WEEKDAY: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
type Params = Record<string, unknown>;

function weekdayNumbers(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out = raw.map((d) => (typeof d === "number" ? d : OLD_WEEKDAY[String(d).slice(0, 3).toLowerCase()] ?? Number(d))).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return Array.from(new Set(out));
}

/** "weeks" is not a server unit: convert to days x 7. */
function unitPair(amount: unknown, unit: unknown): [number, string] {
  const n = Number(amount);
  const u = str(unit);
  if (u === "weeks" || u === "week") return [Number.isFinite(n) ? n * 7 : 7, "days"];
  return [Number.isFinite(n) ? n : 0, (DELAY_UNITS as readonly string[]).includes(u) ? u : "days"];
}

const recipient = (p: Params) => (str(p.to) === "user" ? str(p.userId) || "owner" : str(p.to) || "owner");
const OLD_STAFF_CHANNEL: Record<string, string> = { internal_email: "email", internal_sms: "sms", in_app_notification: "in_app" };
const WEBHOOK_KEYS = new Set(WEBHOOK_FIELDS.map(([k]) => k));

/** One action's params in the server form (old v786 names and params converted). */
function serverAction(action: string, p: Params): { action: string; params: Params } {
  if (OLD_STAFF_CHANNEL[action] || action === "notify_staff") {
    const message = str(p.message) || [str(p.subject), str(p.body)].filter(Boolean).join("\n");
    return { action: "notify_staff", params: { channel: OLD_STAFF_CHANNEL[action] ?? (str(p.channel) || "in_app"), to: recipient(p), message } };
  }
  if (action === "set_property" || action === "set_contact_field") return { action: "set_contact_field", params: { field: str(p.field), value: p.value ?? "" } };
  if (action === "set_stage" || action === "set_application_stage") return { action: "set_application_stage", params: { stage: str(p.stage) } };
  if (action === "send_sms") {
    const { purpose, ...rest } = p;
    const kind = str(p.kind) || str(purpose);
    return { action, params: { ...rest, kind: kind === "marketing" ? "marketing" : "transactional" } };
  }
  if (action === "create_task") {
    const { taskType, dueHours, assignTo, userId, ...rest } = p;
    const assignee = p.assignee !== undefined ? str(p.assignee) || "owner" : str(assignTo) === "user" && str(userId) ? str(userId) : "owner";
    const due = Number(p.dueInHours ?? dueHours ?? 24);
    return { action, params: { ...rest, type: str(p.type ?? taskType).toUpperCase() || "TODO", priority: str(p.priority).toUpperCase() || "MEDIUM", dueInHours: Number.isFinite(due) ? due : 24, assignee } };
  }
  if (action === "webhook") {
    const { fields, ...rest } = p;
    const include = Array.isArray(p.includeFields)
      ? (p.includeFields as unknown[]).map(str)
      : Array.isArray(fields) ? (fields as Array<{ key?: unknown }>).map((f) => str(f?.key)).filter((k) => WEBHOOK_KEYS.has(k)) : [];
    return { action, params: { ...rest, url: str(p.url), method: "POST", includeFields: include.length || Array.isArray(p.includeFields) ? include : [...DEFAULT_WEBHOOK_FIELDS] } };
  }
  return { action, params: p };
}

/** One node in the server form, with id === key. */
export function toServerNode(node: WorkflowNode, key: string): WorkflowNode {
  if (node.kind === "action") return { ...node, ...serverAction(node.action, (node.params ?? {}) as Params), id: key };
  if (node.kind === "delay") {
    const p = (node.params ?? {}) as Params;
    if (node.mode === "duration") { const [amount, unit] = unitPair(p.amount, p.unit); return { ...node, params: { ...p, amount, unit }, id: key }; }
    if (node.mode === "until_time") return { ...node, params: { ...p, weekdays: weekdayNumbers(p.weekdays) }, id: key };
    const [timeoutAmount, timeoutUnit] = unitPair(p.timeoutAmount, p.timeoutUnit);
    return { ...node, params: { ...p, timeoutAmount, timeoutUnit }, id: key };
  }
  return { ...node, id: key };
}

/** The whole graph in the server form: ids match keys, old v786 names and params converted. */
export function toServerGraph(graph: Graph): Graph {
  const nodes: Record<string, WorkflowNode> = {};
  for (const [key, node] of Object.entries(graph.nodes)) if (node && typeof node === "object") nodes[key] = toServerNode(node, key);
  return { ...graph, nodes };
}
