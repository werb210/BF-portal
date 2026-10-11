// BF_PORTAL_v786_WORKFLOW_BUILDER - every step the "Choose an action" panel offers, grouped the
// way HubSpot groups them, with the node each one starts as and the card category it belongs to.
import type { WorkflowNode } from "./types";

export type Category = "delay" | "workflow" | "internal" | "external" | "assignment" | "create" | "edit" | "list";

export type ActionDef = {
  key: string;
  label: string;
  /** Card title, e.g. "Edit record". */
  title: string;
  group: string;
  category: Category;
  make: () => WorkflowNode;
};

const act = (action: string, params: Record<string, unknown> = {}): WorkflowNode => ({ kind: "action", action, params, next: null });

let seq = 0;
/** Short random-ish id, unique within a session (graph ids only need to be unique per workflow). */
export function newId(prefix = "n"): string {
  seq += 1;
  return prefix + "_" + Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 6);
}

export const ACTIONS: ActionDef[] = [
  { key: "delay_duration", label: "Delay for a set amount of time", title: "Delay", group: "Delay", category: "delay", make: () => ({ kind: "delay", mode: "duration", params: { amount: 1, unit: "days" }, next: null }) },
  { key: "delay_until_time", label: "Delay until a day or time", title: "Delay", group: "Delay", category: "delay", make: () => ({ kind: "delay", mode: "until_time", params: { time: "09:00", weekdays: [] }, next: null }) },
  { key: "delay_until_event", label: "Delay until event happens", title: "Delay", group: "Delay", category: "delay", make: () => ({ kind: "delay", mode: "until_event", params: { event: "", timeoutAmount: 3, timeoutUnit: "days" }, next: null, timeoutNext: null }) },

  { key: "branch", label: "If/then branch", title: "If/then branch", group: "Workflow", category: "workflow", make: () => ({ kind: "branch", branches: [{ id: newId("b"), label: "Branch 1", logic: "all", conditions: [{ field: "", op: "eq", value: "" }], next: null }], noneNext: null }) },
  { key: "value_branch", label: "Value branch", title: "Value branch", group: "Workflow", category: "workflow", make: () => ({ kind: "value_branch", field: "", cases: [], noneNext: null }) },
  { key: "goto", label: "Go to other action", title: "Go to action", group: "Workflow", category: "workflow", make: () => ({ kind: "goto", target: "" }) },
  { key: "enroll_workflow", label: "Enroll in another workflow", title: "Enroll in workflow", group: "Workflow", category: "workflow", make: () => act("enroll_workflow", { workflowId: "" }) },
  { key: "webhook", label: "Trigger webhook", title: "Trigger webhook", group: "Workflow", category: "workflow", make: () => act("webhook", { url: "", fields: [] }) },

  { key: "internal_email", label: "Send internal email notification", title: "Internal email", group: "Internal communication", category: "internal", make: () => act("internal_email", { to: "owner", userId: "", subject: "", body: "" }) },
  { key: "internal_sms", label: "Send internal SMS", title: "Internal SMS", group: "Internal communication", category: "internal", make: () => act("internal_sms", { to: "owner", userId: "", body: "" }) },
  { key: "in_app_notification", label: "Send in-app notification", title: "In-app notification", group: "Internal communication", category: "internal", make: () => act("in_app_notification", { to: "owner", userId: "", body: "" }) },
  { key: "team_post", label: "Post to Team chat", title: "Team chat post", group: "Internal communication", category: "internal", make: () => act("team_post", { channel: "", body: "" }) },

  { key: "send_email", label: "Send email", title: "Send email", group: "External communication", category: "external", make: () => act("send_email", { templateId: "" }) },
  { key: "send_sms", label: "Send SMS", title: "Send SMS", group: "External communication", category: "external", make: () => act("send_sms", { templateId: "", body: "", purpose: "transactional" }) },
  { key: "notify_client", label: "Notify client", title: "Notify client", group: "External communication", category: "external", make: () => act("notify_client", { title: "", body: "" }) },

  { key: "rotate_owner", label: "Rotate contact to owner", title: "Rotate owner", group: "Assignment", category: "assignment", make: () => act("rotate_owner", { userIds: [] }) },
  { key: "assign_owner", label: "Assign owner", title: "Assign owner", group: "Assignment", category: "assignment", make: () => act("assign_owner", { userId: "" }) },

  { key: "create_task", label: "Create task", title: "Create task", group: "Create", category: "create", make: () => act("create_task", { title: "", taskType: "TODO", priority: "MEDIUM", dueHours: 24, assignTo: "owner", userId: "" }) },
  { key: "add_note", label: "Add note", title: "Add note", group: "Create", category: "create", make: () => act("add_note", { body: "" }) },

  { key: "set_property", label: "Set contact property", title: "Edit record", group: "Edit record", category: "edit", make: () => act("set_property", { field: "", value: "" }) },
  { key: "set_stage", label: "Set application stage", title: "Edit record", group: "Edit record", category: "edit", make: () => act("set_stage", { stage: "" }) },
  { key: "add_tag", label: "Add tag", title: "Edit record", group: "Edit record", category: "edit", make: () => act("add_tag", { tag: "" }) },
  { key: "remove_tag", label: "Remove tag", title: "Edit record", group: "Edit record", category: "edit", make: () => act("remove_tag", { tag: "" }) },

  { key: "add_to_list", label: "Add to list", title: "List membership", group: "List management", category: "list", make: () => act("add_to_list", { listId: "" }) },
  { key: "remove_from_list", label: "Remove from list", title: "List membership", group: "List management", category: "list", make: () => act("remove_from_list", { listId: "" }) },
];

export const GROUPS: string[] = Array.from(new Set(ACTIONS.map((a) => a.group)));

/** The panel key for a node (delays and control nodes have no `action`). */
export function choiceOf(node: WorkflowNode): string {
  switch (node.kind) {
    case "delay": return "delay_" + node.mode;
    case "branch": return "branch";
    case "value_branch": return "value_branch";
    case "goto": return "goto";
    default: return node.action;
  }
}

export function defOf(node: WorkflowNode): ActionDef | undefined {
  const key = choiceOf(node);
  return ACTIONS.find((a) => a.key === key);
}

/** Search the panel list: case-insensitive match on the label or group. */
export function searchActions(query: string): ActionDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return ACTIONS;
  return ACTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
}

// Strip colours per category. Decorative only (text never sits on them).
export const CATEGORY_COLOR: Record<Category, string> = {
  delay: "#d97706",
  workflow: "#7c3aed",
  internal: "#2563eb",
  external: "#0f766e",
  assignment: "#db2777",
  create: "#16a34a",
  edit: "#ea580c",
  list: "#0891b2",
};
