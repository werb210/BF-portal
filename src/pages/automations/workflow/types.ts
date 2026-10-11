// BF_PORTAL_v786_WORKFLOW_BUILDER - the workflow graph format shared with BF-Server v786.

export type Condition = { field: string; op: string; value?: string };
export type Logic = "all" | "any";

export type Trigger = { type: string; filters: Condition[]; filterLogic: Logic };

export type ActionNode = { kind: "action"; action: string; params: Record<string, unknown>; next: string | null };
export type DelayMode = "duration" | "until_time" | "until_event";
export type DelayNode = { kind: "delay"; mode: DelayMode; params: Record<string, unknown>; next: string | null; timeoutNext?: string | null };
export type Branch = { id: string; label: string; logic: Logic; conditions: Condition[]; next: string | null };
export type BranchNode = { kind: "branch"; branches: Branch[]; noneNext: string | null };
export type ValueCase = { id: string; label: string; value: string; next: string | null };
export type ValueBranchNode = { kind: "value_branch"; field: string; cases: ValueCase[]; noneNext: string | null };
export type GotoNode = { kind: "goto"; target: string };

export type WorkflowNode = ActionNode | DelayNode | BranchNode | ValueBranchNode | GotoNode;

export type Graph = { triggers: Trigger[]; startNodeId: string | null; nodes: Record<string, WorkflowNode> };

export type Reenroll = "never" | "after_complete" | "always";
export type Settings = {
  reenroll: Reenroll;
  quietHours: { enabled: boolean; start: string; end: string; tz: string };
  unenrollOnGoal: boolean;
  testMode: boolean;
};
export type Goal = null | { logic: Logic; conditions: Condition[] };
export type Silo = "BF" | "BI";

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

export type Issue = { nodeId: string | null; message: string };

export type FieldDef = { key: string; label: string; type: string; options: Array<{ value: string; label: string }> };
export type TriggerDef = { key: string; label: string; group: string; fields: string[] };
export type Template = { id: string; name: string; subject?: string; body?: string };
export type Catalog = {
  triggers: TriggerDef[];
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
  quietHours: { enabled: false, start: "21:00", end: "08:00", tz: "America/Edmonton" },
  unenrollOnGoal: true,
  testMode: false,
};

export function emptyWorkflow(silo: Silo = "BF"): Workflow {
  return { name: "Unnamed workflow", silo, enabled: false, graph: { triggers: [], startNodeId: null, nodes: {} }, settings: { ...DEFAULT_SETTINGS, quietHours: { ...DEFAULT_SETTINGS.quietHours } }, goal: null };
}
