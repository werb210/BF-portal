// BF_PORTAL_v786_WORKFLOW_BUILDER - every step the "Choose an action" panel offers, grouped the
// way HubSpot groups them, with the node each one starts as and the card category it belongs to.
// BF_PORTAL_v787_BUILDER_FIXES - every entry makes a BF-Server ACTION_TYPES action with the params
// graphActions.ts reads (notify_staff, set_contact_field, set_application_stage, kind, ...).
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
  /** Not offered in the "Choose an action" list (still used to title existing cards). */
  hidden?: boolean;
};

/** Context keys a webhook can send (BF-Server buildContext keys). */
export const WEBHOOK_FIELDS: Array<[string, string]> = [
  ["first_name", "Contact first name"],
  ["last_name", "Contact last name"],
  ["email", "Contact email"],
  ["phone", "Contact phone"],
  ["company_name", "Company name"],
  ["owner_id", "Contact owner"],
  ["application_id", "Application id"],
  ["stage", "Application stage"],
  ["silo", "Silo"],
  ["trigger", "Trigger type"],
];
export const DEFAULT_WEBHOOK_FIELDS = ["first_name", "email", "phone", "application_id", "silo"];
export const TASK_TYPES = ["CALL", "EMAIL", "SMS", "TODO"];
export const TASK_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH"];
export const STAFF_CHANNELS = ["email", "sms", "in_app", "team"] as const;

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
  { key: "webhook", label: "Trigger webhook", title: "Trigger webhook", group: "Workflow", category: "workflow", make: () => act("webhook", { url: "", method: "POST", includeFields: [...DEFAULT_WEBHOOK_FIELDS] }) },

  { key: "notify_staff_email", label: "Send internal email notification", title: "Internal email", group: "Internal communication", category: "internal", make: () => act("notify_staff", { channel: "email", to: "owner", message: "" }) },
  { key: "notify_staff_sms", label: "Send internal SMS", title: "Internal SMS", group: "Internal communication", category: "internal", make: () => act("notify_staff", { channel: "sms", to: "owner", message: "" }) },
  { key: "notify_staff_in_app", label: "Send in-app notification", title: "In-app notification", group: "Internal communication", category: "internal", make: () => act("notify_staff", { channel: "in_app", to: "owner", message: "" }) },
  { key: "notify_staff_team", label: "Send staff notice to Team chat", title: "Team chat notice", group: "Internal communication", category: "internal", hidden: true, make: () => act("notify_staff", { channel: "team", to: "owner", message: "" }) },
  { key: "team_post", label: "Post to Team chat", title: "Team chat post", group: "Internal communication", category: "internal", make: () => act("team_post", { channel: "", body: "" }) },

  { key: "send_email", label: "Send email", title: "Send email", group: "External communication", category: "external", make: () => act("send_email", { templateId: "" }) },
  { key: "send_sms", label: "Send SMS", title: "Send SMS", group: "External communication", category: "external", make: () => act("send_sms", { templateId: "", body: "", kind: "transactional" }) },
  { key: "notify_client", label: "Notify client", title: "Notify client", group: "External communication", category: "external", make: () => act("notify_client", { title: "", body: "" }) },

  { key: "rotate_owner", label: "Rotate contact to owner", title: "Rotate owner", group: "Assignment", category: "assignment", make: () => act("rotate_owner", { userIds: [] }) },
  { key: "assign_owner", label: "Assign owner", title: "Assign owner", group: "Assignment", category: "assignment", make: () => act("assign_owner", { userId: "" }) },

  { key: "create_task", label: "Create task", title: "Create task", group: "Create", category: "create", make: () => act("create_task", { title: "", type: "TODO", priority: "MEDIUM", dueInHours: 24, assignee: "owner" }) },
  { key: "add_note", label: "Add note", title: "Add note", group: "Create", category: "create", make: () => act("add_note", { body: "" }) },

  { key: "set_contact_field", label: "Set contact property", title: "Edit record", group: "Edit record", category: "edit", make: () => act("set_contact_field", { field: "", value: "" }) },
  { key: "set_application_stage", label: "Set application stage", title: "Edit record", group: "Edit record", category: "edit", make: () => act("set_application_stage", { stage: "" }) },
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
    default: return node.action === "notify_staff" ? "notify_staff_" + (STAFF_CHANNELS.includes(String(node.params.channel) as never) ? String(node.params.channel) : "in_app") : node.action;
  }
}

export function defOf(node: WorkflowNode): ActionDef | undefined {
  const key = choiceOf(node);
  return ACTIONS.find((a) => a.key === key);
}

/** Search the panel list: case-insensitive match on the label or group. */
export function searchActions(query: string): ActionDef[] {
  const q = query.trim().toLowerCase();
  const offered = ACTIONS.filter((a) => !a.hidden);
  if (!q) return offered;
  return offered.filter((a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
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
