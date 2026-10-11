// BF_PORTAL_v786_WORKFLOW_BUILDER - the BF-Server v786 automation endpoints. The api client
// already unwraps json.data, so responses here are the payload itself.
import { api } from "@/api";
import { DEFAULT_SETTINGS, emptyWorkflow, type Catalog, type FieldDef, type Graph, type Issue, type ListRef, type Settings, type Silo, type Template, type TriggerDef, type UserRef, type Workflow, type WorkflowRef } from "./types";

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

const TRIGGER_GROUPS = ["Contact", "Application", "Engagement", "Email", "Date", "Manual"];
function guessGroup(key: string): string {
  const head = key.split(/[._]/)[0]?.toLowerCase() ?? "";
  if (head === "contact") return "Contact";
  if (head === "application" || head === "document") return "Application";
  if (head === "email") return "Email";
  if (head === "date") return "Date";
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
    const key = s(t.key ?? t.type);
    const group = s(t.group);
    return { key, label: s(t.label) || key, group: TRIGGER_GROUPS.includes(group) ? group : guessGroup(key), fields: asArray<string>(t.fields).map(s) };
  });
  const templates = isObj(c.templates) ? c.templates : {};
  const tpl = (list: unknown): Template[] => asArray(list).filter(isObj).map((t) => ({ id: s(t.id ?? t.key), name: s(t.name ?? t.title ?? t.id), subject: t.subject ? s(t.subject) : undefined, body: t.body ?? t.html ? s(t.body ?? t.html) : undefined }));
  return {
    triggers,
    fields,
    operators: asArray<string>(c.operators).map(s).length ? asArray<string>(c.operators).map(s) : ["eq", "neq", "contains", "gt", "lt", "is_set", "is_not_set"],
    templates: { email: tpl(templates.email), sms: tpl(templates.sms) },
    stages: asArray(c.stages).map((x) => isObj(x) ? s(x.key ?? x.name ?? x.label) : s(x)),
    events: asArray(c.events).filter(isObj).map((e) => ({ key: s(e.key), label: s(e.label ?? e.key) })),
    tokens: asArray(c.tokens).map((x) => isObj(x) ? s(x.key ?? x.token) : s(x)).filter(Boolean),
  };
}

export function normalizeWorkflow(raw: unknown): Workflow {
  const w = isObj(raw) ? raw : {};
  const base = emptyWorkflow();
  const graph = isObj(w.graph) ? w.graph as Partial<Graph> : {};
  const settings = isObj(w.settings) ? w.settings as Partial<Settings> : {};
  return {
    id: w.id ? s(w.id) : undefined,
    name: s(w.name) || base.name,
    silo: (s(w.silo).toUpperCase() === "BI" ? "BI" : "BF") as Silo,
    enabled: Boolean(w.enabled),
    graph: {
      triggers: Array.isArray(graph.triggers) ? graph.triggers.map((t) => ({ type: s(t.type), filters: Array.isArray(t.filters) ? t.filters : [], filterLogic: t.filterLogic === "any" ? "any" : "all" })) : [],
      startNodeId: graph.startNodeId ?? null,
      nodes: isObj(graph.nodes) ? graph.nodes as Graph["nodes"] : {},
    },
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
  return { name: w.name, silo: w.silo, enabled: w.enabled, graph: w.graph, settings: w.settings, goal: w.goal };
}

export function errorText(error: unknown, fallback: string): string {
  const e = error as { message?: unknown; details?: { error?: { message?: string } | string; message?: string } };
  const detail = e?.details;
  const fromDetails = typeof detail?.error === "string" ? detail.error : detail?.error?.message ?? detail?.message;
  const message = fromDetails || (typeof e?.message === "string" && e.message !== "API_ERROR" ? e.message : "");
  return message || fallback;
}

export type Performance = { enrolled: number; active: number; completed: number; goalReached: number; steps: Record<string, number> };
export type HistoryStep = { nodeId: string; at: string; result: string; detail?: string | null };
export type Enrollment = { id: string; contactId?: string | null; contactName: string; enrolledAt: string; status: string; currentNodeId: string | null; steps: HistoryStep[] };
export type LibraryItem = { key: string; name: string; description: string; category?: string };

export function normalizePerformance(raw: unknown): Performance {
  const p = isObj(raw) ? raw : {};
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const stepsRaw = p.steps ?? p.perStep ?? p.nodes;
  const steps: Record<string, number> = {};
  if (Array.isArray(stepsRaw)) for (const x of stepsRaw) { if (isObj(x)) steps[s(x.nodeId ?? x.id)] = n(x.count ?? x.total); }
  else if (isObj(stepsRaw)) for (const [k, v] of Object.entries(stepsRaw)) steps[k] = n(isObj(v) ? v.count ?? v.total : v);
  return { enrolled: n(p.enrolled), active: n(p.active), completed: n(p.completed), goalReached: n(p.goalReached ?? p.goal_reached), steps };
}

export function normalizeHistory(raw: unknown): Enrollment[] {
  return asArray(raw, "enrollments", "items").filter(isObj).map((e) => ({
    id: s(e.id),
    contactId: e.contactId ? s(e.contactId) : e.contact_id ? s(e.contact_id) : null,
    contactName: s(e.contactName ?? e.contact_name ?? e.contactId ?? e.contact_id) || "Unknown contact",
    enrolledAt: s(e.enrolledAt ?? e.enrolled_at ?? e.created_at),
    status: s(e.status) || "active",
    currentNodeId: e.currentNodeId ? s(e.currentNodeId) : e.current_node_id ? s(e.current_node_id) : null,
    steps: asArray(e.steps ?? e.log).filter(isObj).map((x) => ({ nodeId: s(x.nodeId ?? x.node_id), at: s(x.at ?? x.created_at), result: s(x.result ?? x.outcome), detail: x.detail ? s(x.detail) : null })),
  }));
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
  performance: async (id: string): Promise<Performance> => normalizePerformance(await api.get("/api/automations/" + encodeURIComponent(id) + "/performance")),
  history: async (id: string): Promise<Enrollment[]> => normalizeHistory(await api.get("/api/automations/" + encodeURIComponent(id) + "/history")),
  library: async (): Promise<LibraryItem[]> => asArray(await api.get("/api/automations/library"), "items", "library").filter(isObj).map((x) => ({ key: s(x.key), name: s(x.name ?? x.key), description: s(x.description), category: x.category ? s(x.category) : undefined })),
  fromLibrary: async (key: string): Promise<Workflow> => normalizeWorkflow(await api.post("/api/automations/from-library", { key })),
  draftFromText: async (prompt: string, silo: Silo): Promise<Workflow> => normalizeWorkflow(await api.post("/api/automations/draft-from-text", { prompt, silo })),
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
