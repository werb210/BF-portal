// BF_PORTAL_v786_WORKFLOW_BUILDER - the workflow graph format shared with BF-Server v786.
// BF_PORTAL_v787_BUILDER_FIXES - matches BF-Server src/modules/automation/graph.ts: every node
// carries its own id, triggers keep params, weekdays are 0-6 (Sunday = 0), quiet hours are the
// hours sending is allowed.

export type Condition = { field: string; op: string; value?: string };
export type Logic = "all" | "any";

export type Trigger = { type: string; filters: Condition[]; filterLogic: Logic; params?: Record<string, unknown> };

export type ActionNode = { id?: string; kind: "action"; action: string; params: Record<string, unknown>; next: string | null };
export type DelayMode = "duration" | "until_time" | "until_event";
export type DelayNode = { id?: string; kind: "delay"; mode: DelayMode; params: Record<string, unknown>; next: string | null; timeoutNext?: string | null };
export type Branch = { id: string; label: string; logic: Logic; conditions: Condition[]; next: string | null };
export type BranchNode = { id?: string; kind: "branch"; branches: Branch[]; noneNext: string | null };
export type ValueCase = { id: string; label: string; value: string; next: string | null };
export type ValueBranchNode = { id?: string; kind: "value_branch"; field: string; cases: ValueCase[]; noneNext: string | null };
export type GotoNode = { id?: string; kind: "goto"; target: string };

export type WorkflowNode = ActionNode | DelayNode | BranchNode | ValueBranchNode | GotoNode;

export type Graph = { triggers: Trigger[]; startNodeId: string | null; nodes: Record<string, WorkflowNode> };

export type Reenroll = "never" | "after_complete" | "always";
export type Settings = {
  reenroll: Reenroll;
  /** The hours sending is ALLOWED (server quietHoursRelease holds sends outside start..end). */
  quietHours: { enabled: boolean; start: string; end: string; tz: string };
  unenrollOnGoal: boolean;
  testMode: boolean;
};
export type Goal = null | { logic: Logic; conditions: Condition[] };
export type Silo = "BF" | "BI" | "SLF";

export type Workflow = {
  id?: string;
  name: string;
  silo: Silo;
  enabled: boolean;
  graph: Graph;
  settings: Settings;
  goal: Goal;
  active_count?: number;
  total_count?: number;
};

/**
 * Where a "+" sits: the pointer `port` on `parent`. parent "trigger" + port "start" is the
 * slot directly under the trigger card. Ports: next, timeoutNext, noneNext, branch:<id>, case:<id>.
 */
export type Slot = { parent: string; port: string };

/** nodeId is a step id, "trigger:<index>" for a trigger, or null for the whole workflow. */
export type Issue = { nodeId: string | null; message: string };

export type FieldDef = { key: string; label: string; type: string; options: Array<{ value: string; label: string }> };
export type TriggerDef = { type: string; label: string; group: string; filterFields: string[] };
export type ActionParamDef = { key: string; label: string; type: string; required?: boolean; options: string[] };
export type ActionCatalogDef = { action: string; label: string; group: string; params: ActionParamDef[] };
export type Template = { id: string; name: string; subject?: string; body?: string };
export type Catalog = {
  triggers: TriggerDef[];
  actions: ActionCatalogDef[];
  fields: FieldDef[];
  operators: string[];
  templates: { email: Template[]; sms: Template[] };
  stages: string[];
  events: Array<{ key: string; label: string }>;
  tokens: string[];
};

export type ListRef = { id: string; name: string };
export type UserRef = { id: string; name: string };
export type WorkflowRef = { id: string; name: string };

export const DEFAULT_SETTINGS: Settings = {
  reenroll: "never",
  quietHours: { enabled: true, start: "09:00", end: "20:00", tz: "America/Edmonton" },
  unenrollOnGoal: true,
  testMode: false,
};

export function emptyWorkflow(silo: Silo = "BF"): Workflow {
  return { name: "Unnamed workflow", silo, enabled: false, graph: { triggers: [], startNodeId: null, nodes: {} }, settings: { ...DEFAULT_SETTINGS, quietHours: { ...DEFAULT_SETTINGS.quietHours } }, goal: null };
}
