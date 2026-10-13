// BF_PORTAL_v786_WORKFLOW_BUILDER - the BF-Server v786 automation endpoints. The api client
// already unwraps json.data, so responses here are the payload itself.
// BF_PORTAL_v787_BUILDER_FIXES - shapes from BF-Server src/routes/automations.ts and library.ts:
// catalog triggers {type, label, group, filterFields}, actions {action, label, group, params},
// performance byNode {entered, failed}, history {label, path}, errors {error: {code}, issues}.
import { api } from "@/api";
import { toServerGraph } from "./graph";
import { DEFAULT_SETTINGS, emptyWorkflow, type ActionCatalogDef, type Catalog, type FieldDef, type Goal, type Graph, type Issue, type ListRef, type Settings, type Silo, type Template, type Trigger, type TriggerDef, type UserRef, type Workflow, type WorkflowRef } from "./types";

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => !!v && typeof v === "object" && !Array.isArray(v);
const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** Pull an array out of a payload that is either the array or { <key>: array }. */
export function asArray<T = unknown>(payload: unknown, ...keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isObj(payload)) for (const key of keys) if (Array.isArray(payload[key])) return payload[key] as T[];
  return [];
}

function normOptions(raw: unknown): FieldDef["options"] {
  return asArray(raw).map((o) => isObj(o) ? { value: s(o.value ?? o.key ?? o.id), label: s(o.label ?? o.name ?? o.value ?? o.key) } : { value: s(o), label: s(o) });
}

/** The trigger groups BF-Server library.ts uses, in panel order. */
export const TRIGGER_GROUPS = ["Contacts", "Applications", "Meetings", "Messages", "Engagement", "Dates", "Manual"];
function guessGroup(key: string): string {
  const head = key.split(/[._]/)[0]?.toLowerCase() ?? "";
  if (head === "contact") return "Contacts";
  if (head === "application" || head === "document") return "Applications";
  if (head === "booking" || head === "meeting") return "Meetings";
  if (head === "message" || head === "call" || head === "no") return "Messages";
  if (head === "date") return "Dates";
  if (head === "manual") return "Manual";
  return "Engagement";
}

/** Accepts the catalog in either the record or the array shape and fills in what is missing. */
export function normalizeCatalog(raw: unknown): Catalog {
  const c = isObj(raw) ? raw : {};
  const fieldsRaw = c.fields;
  const fields: FieldDef[] = Array.isArray(fieldsRaw)
    ? fieldsRaw.filter(isObj).map((f) => ({ key: s(f.key ?? f.name), label: s(f.label ?? f.key), type: s(f.type) || "text", options: normOptions(f.options) }))
    : isObj(fieldsRaw) ? Object.entries(fieldsRaw).map(([key, f]) => ({ key, label: s(isObj(f) ? f.label : key) || key, type: s(isObj(f) ? f.type : "") || "text", options: normOptions(isObj(f) ? f.options : []) })) : [];
  const triggers: TriggerDef[] = asArray(c.triggers).filter(isObj).map((t) => {
    const type = s(t.type ?? t.key);
    const group = s(t.group);
    return { type, label: s(t.label) || type, group: TRIGGER_GROUPS.includes(group) ? group : guessGroup(type), filterFields: asArray<string>(t.filterFields ?? t.fields).map(s) };
  });
  const actions: ActionCatalogDef[] = asArray(c.actions).filter(isObj).map((a) => ({
    action: s(a.action ?? a.key),
    label: s(a.label),
    group: s(a.group),
    params: asArray(a.params).filter(isObj).map((x) => ({ key: s(x.key), label: s(x.label ?? x.key), type: s(x.type), required: x.required === true, options: asArray(x.options).map((o) => (isObj(o) ? s(o.value ?? o.key) : s(o))) })),
  }));
  const templates = isObj(c.templates) ? c.templates : {};
  const tpl = (list: unknown): Template[] => asArray(list).filter(isObj).map((t) => ({ id: s(t.id ?? t.key), name: s(t.name ?? t.title ?? t.id), subject: t.subject ? s(t.subject) : undefined, body: t.body ?? t.html ? s(t.body ?? t.html) : undefined }));
  return {
    triggers,
    actions,
    fields,
    operators: asArray<string>(c.operators).map(s).length ? asArray<string>(c.operators).map(s) : ["eq", "neq", "contains", "gt", "lt", "is_set", "is_not_set"],
    templates: { email: tpl(templates.email), sms: tpl(templates.sms) },
    stages: asArray(c.stages).map((x) => isObj(x) ? s(x.key ?? x.name ?? x.label) : s(x)),
    events: asArray(c.events).filter(isObj).map((e) => ({ key: s(e.key), label: s(e.label ?? e.key) })),
    tokens: asArray(c.tokens).map((x) => isObj(x) ? s(x.key ?? x.token) : s(x)).filter(Boolean),
  };
}

function normalizeTrigger(t: Loose): Trigger {
  const out: Trigger = { type: s(t.type), filters: Array.isArray(t.filters) ? t.filters : [], filterLogic: t.filterLogic === "any" ? "any" : "all" };
  if (isObj(t.params)) out.params = { ...t.params };
  return out;
}

const SILO_SET = new Set(["BF", "BI", "SLF"]);
export const toSilo = (v: unknown): Silo => (SILO_SET.has(s(v).toUpperCase()) ? s(v).toUpperCase() : "BF") as Silo;

export function normalizeWorkflow(raw: unknown): Workflow {
  const w = isObj(raw) ? raw : {};
  const base = emptyWorkflow();
  const graph = isObj(w.graph) ? w.graph as Partial<Graph> : {};
  const settings = isObj(w.settings) ? w.settings as Partial<Settings> : {};
  return {
    id: w.id ? s(w.id) : undefined,
    name: s(w.name) || base.name,
    silo: toSilo(w.silo),
    enabled: Boolean(w.enabled),
    graph: toServerGraph({
      triggers: Array.isArray(graph.triggers) ? graph.triggers.filter(isObj).map((t) => normalizeTrigger(t as Loose)) : [],
      startNodeId: graph.startNodeId ?? null,
      nodes: isObj(graph.nodes) ? graph.nodes as Graph["nodes"] : {},
    }),
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      quietHours: { ...DEFAULT_SETTINGS.quietHours, ...(isObj(settings.quietHours) ? settings.quietHours : {}) },
    },
    goal: isObj(w.goal) && Array.isArray((w.goal as Loose).conditions) ? { logic: (w.goal as Loose).logic === "any" ? "any" : "all", conditions: (w.goal as Loose).conditions as never } : null,
    active_count: typeof w.active_count === "number" ? w.active_count : undefined,
    total_count: typeof w.total_count === "number" ? w.total_count : undefined,
  };
}

/** The body POST/PATCH /api/automations takes. */
export function toBody(w: Workflow) {
  return { name: w.name, silo: w.silo, enabled: w.enabled, graph: toServerGraph(w.graph), settings: w.settings, goal: w.goal };
}

/** Readable text for each BF-Server error code. */
export const ERROR_CODE_TEXT: Record<string, string> = {
  fix_issues_before_enabling: "Fix the issues before turning this workflow on",
  draft_invalid: "The AI draft has issues. It was opened so you can fix them",
  draft_failed: "The AI could not draft that workflow. Try describing it differently",
  openai_not_configured: "AI drafting is not set up on the server",
  prompt_required: "Describe what the workflow should do",
  name_required: "Give the workflow a name",
  graph_required: "The workflow has no steps to save",
  unknown_trigger: "That trigger is not supported",
  invalid_steps: "Some steps are not valid",
  unknown_template: "That template no longer exists",
  not_found: "This workflow was not found. It may have been deleted, or it belongs to another silo",
  not_enrolled: "That contact could not be enrolled (already enrolled, or re-enrollment is off)",
  contact_or_application_required: "Choose a contact to enroll",
  invalid_id: "That item was not found",
};

type ErrorLike = { status?: unknown; message?: unknown; details?: unknown };
const detailsOf = (error: unknown): Loose => (isObj((error as ErrorLike)?.details) ? (error as ErrorLike).details as Loose : {});

/** The issues a server error carries ({error, issues}). */
export function errorIssues(error: unknown): Issue[] {
  return asArray<Loose>(detailsOf(error).issues).filter(isObj).map((i) => ({ nodeId: i.nodeId === null || i.nodeId === undefined ? null : s(i.nodeId), message: s(i.message) }));
}

/** The code of a server error ({error: {code}}), if any. */
export function errorCode(error: unknown): string {
  const d = detailsOf(error);
  return isObj(d.error) ? s(d.error.code) : s((error as { code?: unknown })?.code);
}

/**
 * A readable message for a failed call. Server codes map to plain English; the generic `fallback`
 * (e.g. "Only admins and marketing ...") is only used for 403, or when nothing better is known.
 */
export function errorText(error: unknown, fallback: string, forbidden?: string): string {
  const e = error as ErrorLike;
  const status = Number(e?.status);
  const d = detailsOf(error);
  const code = errorCode(error);
  const issues = errorIssues(error);
  const suffix = issues.length ? ": " + issues.map((i) => i.message).join("; ") : ".";
  if (code && ERROR_CODE_TEXT[code]) return ERROR_CODE_TEXT[code] + suffix;
  if (status === 403) return forbidden ?? "You do not have permission to do that.";
  const fromDetails = isObj(d.error) ? s(d.error.message) : typeof d.error === "string" ? d.error : s(d.message);
  const message = fromDetails || (typeof e?.message === "string" && e.message !== "API_ERROR" ? e.message : "");
  if (message) return message + (issues.length ? suffix : "");
  if (code) return code.replace(/_/g, " ") + suffix;
  return fallback;
}

export type NodeStat = { entered: number; failed: number };
export type Performance = { enrolled: number; active: number; completed: number; goalReached: number; byNode: Record<string, NodeStat> };
export type PathStep = { nodeId: string | null; kind: string; at: string; result: string };
export type Enrollment = { id: string; contactId?: string | null; label: string; enrolledAt: string; status: string; currentNodeId: string | null; path: PathStep[]; lastError?: string | null };
export type Draft = { name: string; graph: Graph; settings: Settings; goal: Goal };
export type LibraryItem = { key: string; name: string; description: string; category?: string };

export function normalizePerformance(raw: unknown): Performance {
  const p = isObj(raw) ? raw : {};
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const byNode: Record<string, NodeStat> = {};
  if (isObj(p.byNode)) for (const [k, v] of Object.entries(p.byNode)) byNode[k] = isObj(v) ? { entered: n(v.entered), failed: n(v.failed) } : { entered: n(v), failed: 0 };
  return { enrolled: n(p.enrolled), active: n(p.active), completed: n(p.completed), goalReached: n(p.goalReached ?? p.goal_reached), byNode };
}

export function normalizeHistory(raw: unknown): Enrollment[] {
  return asArray(raw, "enrollments", "items").filter(isObj).map((e) => ({
    id: s(e.id),
    contactId: e.contact_id ? s(e.contact_id) : null,
    label: s(e.label) || "Unknown contact",
    enrolledAt: s(e.created_at),
    status: s(e.status) || "active",
    currentNodeId: e.current_node_id ? s(e.current_node_id) : null,
    path: asArray(e.path).filter(isObj).map((x) => ({ nodeId: x.nodeId ? s(x.nodeId) : null, kind: s(x.kind), at: s(x.at), result: s(x.result) })),
    lastError: e.last_error ? s(e.last_error) : null,
  }));
}

// BF_PORTAL_v792 - a test run (POST /:id/enroll with testMode). BF-Server v792 returns the step log
// as `steps`; older servers return only {enrollmentId, outcome}, so the log is fetched separately.
export type TestStep = { stepIndex: number; nodeId: string | null; stepType: string; outcome: string; detail: string };
export type TestRun = { enrollmentId: string; outcome: string; steps: TestStep[] | null };

export function normalizeTestSteps(raw: unknown): TestStep[] {
  return asArray(raw, "steps", "items", "log").filter(isObj).map((x, i) => ({
    stepIndex: Number.isFinite(Number(x.step_index ?? x.stepIndex)) ? Number(x.step_index ?? x.stepIndex) : i,
    nodeId: x.node_id ?? x.nodeId ? s(x.node_id ?? x.nodeId) : null,
    stepType: s(x.step_type ?? x.stepType),
    outcome: s(x.outcome),
    detail: s(x.detail),
  }));
}

export function normalizeTestRun(raw: unknown): TestRun {
  let r: Loose = isObj(raw) ? raw : {};
  if (!r.enrollmentId && isObj(r.data)) r = r.data; // in case the ok envelope was not unwrapped
  return { enrollmentId: s(r.enrollmentId ?? r.enrollment_id), outcome: s(r.outcome), steps: Array.isArray(r.steps) ? normalizeTestSteps(r.steps) : null };
}

export function normalizeDraft(raw: unknown): Draft {
  const w = normalizeWorkflow(raw);
  return { name: w.name, graph: w.graph, settings: w.settings, goal: w.goal };
}

export const workflowApi = {
  catalog: async (): Promise<Catalog> => normalizeCatalog(await api.get("/api/automations/catalog")),
  list: async (): Promise<Workflow[]> => asArray(await api.get("/api/automations"), "automations", "items").map(normalizeWorkflow),
  get: async (id: string): Promise<Workflow> => normalizeWorkflow(await api.get("/api/automations/" + encodeURIComponent(id))),
  create: async (w: Workflow): Promise<Workflow> => normalizeWorkflow(await api.post("/api/automations", toBody(w))),
  update: async (id: string, w: Partial<Workflow>): Promise<Workflow> => normalizeWorkflow(await api.patch("/api/automations/" + encodeURIComponent(id), w.graph ? toBody(w as Workflow) : w)),
  remove: (id: string) => api.delete("/api/automations/" + encodeURIComponent(id)),
  validate: async (id: string): Promise<Issue[]> => asArray<Issue>(await api.post("/api/automations/" + encodeURIComponent(id) + "/validate", {}), "issues").map((i) => ({ nodeId: i.nodeId ?? null, message: s(i.message) })),
  enroll: (id: string, contactId: string) => api.post("/api/automations/" + encodeURIComponent(id) + "/enroll", { contactId }),
  testRun: async (id: string, contactId: string): Promise<TestRun> => normalizeTestRun(await api.post("/api/automations/" + encodeURIComponent(id) + "/enroll", { contactId, testMode: true })),
  enrollmentLog: async (enrollmentId: string): Promise<TestStep[]> => normalizeTestSteps(await api.get("/api/automations/enrollments/" + encodeURIComponent(enrollmentId) + "/log")),
  performance: async (id: string): Promise<Performance> => normalizePerformance(await api.get("/api/automations/" + encodeURIComponent(id) + "/performance")),
  history: async (id: string): Promise<Enrollment[]> => normalizeHistory(await api.get("/api/automations/" + encodeURIComponent(id) + "/history")),
  library: async (): Promise<LibraryItem[]> => asArray(await api.get("/api/automations/library"), "items", "library").filter(isObj).map((x) => ({ key: s(x.key), name: s(x.name ?? x.key), description: s(x.description), category: x.category ? s(x.category) : undefined })),
  fromLibrary: async (key: string): Promise<Workflow> => normalizeWorkflow(await api.post("/api/automations/from-library", { key })),
  /** Drafts only (saves nothing). A 422 still carries the draft in error.details.draft. */
  draftFromText: async (prompt: string, silo: Silo): Promise<Draft> => normalizeDraft(await api.post("/api/automations/draft-from-text", { prompt, silo })),
  createFromDraft: async (draft: Draft, silo: Silo): Promise<Workflow> => normalizeWorkflow(await api.post("/api/automations", { name: draft.name, silo, enabled: false, graph: toServerGraph(draft.graph), settings: draft.settings, goal: draft.goal })),
  lists: async (): Promise<ListRef[]> => asArray(await api.get("/api/automations/lists"), "lists", "items").filter(isObj).map((l) => ({ id: s(l.id), name: s(l.name) })),
  createList: async (name: string): Promise<ListRef> => { const l = await api.post("/api/automations/lists", { name }) as Loose; return { id: s(l?.id), name: s(l?.name) || name }; },
  deleteList: (id: string) => api.delete("/api/automations/lists/" + encodeURIComponent(id)),
  users: async (): Promise<UserRef[]> => asArray<Loose>(await api.get("/api/users"), "users").map((u) => ({ id: s(u.id), name: [u.first_name, u.last_name].filter(Boolean).join(" ") || s(u.name ?? u.email ?? u.id) })),
  workflows: async (): Promise<WorkflowRef[]> => asArray<Loose>(await api.get("/api/automations"), "automations", "items").map((w) => ({ id: s(w.id), name: s(w.name) })),
  searchContacts: async (q: string): Promise<Array<{ id: string; name: string; email?: string | null }>> => {
    const r = await api.get("/api/meetings/people?q=" + encodeURIComponent(q));
    return asArray<Loose>(r, "people").filter((p) => p.contactId).map((p) => ({ id: s(p.contactId), name: s(p.name), email: p.email ? s(p.email) : null }));
  },
};
