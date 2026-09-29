// BF_PORTAL_AUTOMATION_BUILDER_v680 - rule editor for the v616 automation engine.
import { useState, type CSSProperties } from "react";
import { api } from "@/api";

export type Opt = { key: string; label: string };
export type Catalog = { triggers: Array<Opt & { fields: string[] }>; fields: Record<string, { label: string; type: string }>; operators: string[]; actions: Opt[]; checks: Opt[]; stages: string[] };
export type Cond = { field: string; op: string; value?: string };
export type Step = { type: string; [key: string]: unknown };
export type Rule = { id: string; name: string; description?: string | null; trigger_type: string; conditions: Cond[] | Record<string, unknown>; steps: Step[]; enabled: boolean; reenroll: string; test_mode: boolean; active_count?: number; total_count?: number };
export type Run = { id: string; status: string; label?: string | null; current_step: number; next_run_at?: string | null; last_error?: string | null; test_mode: boolean; created_at: string };
export type User = { id: string; name: string };

const OP_LABEL: Record<string, string> = { eq: "is", neq: "is not", in: "is one of", not_in: "is none of", gt: ">", gte: ">=", lt: "<", lte: "<=", contains: "contains", is_set: "has a value", is_not_set: "is empty" };
export const unwrap = <T,>(response: unknown): T => response && typeof response === "object" && "data" in response ? (response as { data: T }).data : response as T;

export function newStep(type: string): Step {
  switch (type) {
    case "create_task": return { type, title: "", body: "", dueHours: 24, taskType: "TODO", priority: "MEDIUM", assignTo: "owner" };
    case "send_sms": return { type, body: "", purpose: "transactional" };
    case "notify_client": return { type, title: "", body: "" };
    case "notify_staff": return { type, body: "" };
    case "assign_owner": return { type, mode: "round_robin" };
    case "add_tag": return { type, tag: "" };
    case "add_note": return { type, body: "" };
    case "team_post": return { type, channel: "", body: "" };
    case "wait": return { type, amount: 1, unit: "hours" };
    case "check": return { type, check: "still_in_stage" };
    default: return { type };
  }
}

export function stepProblem(step: Step): string | null {
  const text = (key: string) => String(step[key] ?? "").trim();
  if (step.type === "wait" && !(Number(step.amount) > 0)) return "Set how long to wait";
  if (["send_sms", "notify_client"].includes(step.type) && !text("body")) return "Write the message";
  if (step.type === "create_task" && !text("title")) return "Give the task a title";
  if (step.type === "add_tag" && !text("tag")) return "Choose a tag";
  if (step.type === "team_post" && !text("channel")) return "Name the channel";
  if (step.type === "assign_owner" && step.mode === "user" && !text("userId")) return "Choose who";
  return null;
}

export function describeRule(rule: Pick<Rule, "trigger_type" | "conditions" | "steps">, catalog: Catalog | null): string {
  const trigger = catalog?.triggers.find(({ key }) => key === rule.trigger_type)?.label ?? rule.trigger_type;
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  const when = conditions.map((condition) => `${(catalog?.fields[condition.field]?.label ?? condition.field).toLowerCase()} ${OP_LABEL[condition.op] ?? condition.op}${condition.value ? ` "${condition.value}"` : ""}`).join(" and ");
  const steps = rule.steps.map((step) => step.type === "wait" ? `wait ${String(step.amount)} ${String(step.unit)}` : (catalog?.actions.find(({ key }) => key === step.type)?.label ?? step.type).toLowerCase());
  return `When ${trigger.toLowerCase()}${when ? ` and ${when}` : ""}: ${steps.length ? steps.join(", then ") : "nothing yet"}`;
}

export const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 12, background: "var(--ui-surface-strong)" };
export const input: CSSProperties = { padding: "7px 9px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
export const small: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)" };
export const btn: CSSProperties = { padding: "6px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 };
export const primary: CSSProperties = { ...btn, background: "var(--ui-accent-blue)", color: "#fff", border: "none", fontWeight: 600 };

function StepEditor({ step, catalog, users, onChange }: { step: Step; catalog: Catalog; users: User[]; onChange: (step: Step) => void }) {
  const set = (key: string, value: unknown) => onChange({ ...step, [key]: value });
  const field = (key: string, label: string, area = false) => area
    ? <textarea aria-label={label} placeholder={label} value={String(step[key] ?? "")} onChange={(event) => set(key, event.target.value)} rows={2} style={{ ...input, width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
    : <input aria-label={label} placeholder={label} value={String(step[key] ?? "")} onChange={(event) => set(key, event.target.value)} style={input} />;
  const people = (key: string) => <select aria-label="Person" value={String(step[key] ?? "")} onChange={(event) => set(key, event.target.value)} style={input}><option value="">Choose a person</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>;
  switch (step.type) {
    case "create_task": return <div style={{ display: "grid", gap: 6 }}>{field("title", "Task title")}{field("body", "Notes (optional)", true)}<div><input aria-label="Due in hours" type="number" min={0} value={Number(step.dueHours)} onChange={(event) => set("dueHours", Number(event.target.value))} style={{ ...input, width: 70 }} /> hours <select aria-label="Task type" value={String(step.taskType)} onChange={(event) => set("taskType", event.target.value)} style={input}>{["TODO", "CALL", "EMAIL", "SMS"].map((value) => <option key={value}>{value}</option>)}</select> <select aria-label="Priority" value={String(step.priority)} onChange={(event) => set("priority", event.target.value)} style={input}>{["LOW", "MEDIUM", "HIGH"].map((value) => <option key={value}>{value}</option>)}</select> <select aria-label="Assign to" value={String(step.assignTo)} onChange={(event) => set("assignTo", event.target.value)} style={input}><option value="owner">The owner</option><option value="user">A person</option></select> {step.assignTo === "user" && people("userId")}</div></div>;
    case "send_sms": return <div>{field("body", "Text message", true)}<select aria-label="Purpose" value={String(step.purpose)} onChange={(event) => set("purpose", event.target.value)} style={input}><option value="transactional">About their application (always sent)</option><option value="marketing">Marketing (only to people who agreed)</option></select></div>;
    case "notify_client": return <div>{field("title", "Title")}{field("body", "Message (app first, text if they have no app)", true)}</div>;
    case "notify_staff": return <div>{field("body", "Notice text", true)}{people("userId")} <span style={small}>(empty = the owner)</span></div>;
    case "assign_owner": return <div><select aria-label="How to assign" value={String(step.mode)} onChange={(event) => set("mode", event.target.value)} style={input}><option value="round_robin">Take turns across active staff</option><option value="user">A specific person</option></select> {step.mode === "user" && people("userId")}</div>;
    case "add_tag": return field("tag", "Tag");
    case "add_note": return field("body", "Note", true);
    case "team_post": return <div>{field("channel", "Channel (for example leads)")}{field("body", "Message", true)}</div>;
    case "wait": return <div><input aria-label="Wait amount" type="number" min={1} value={Number(step.amount)} onChange={(event) => set("amount", Number(event.target.value))} style={{ ...input, width: 80 }} /><select aria-label="Wait unit" value={String(step.unit)} onChange={(event) => set("unit", event.target.value)} style={input}>{["minutes", "hours", "days"].map((unit) => <option key={unit}>{unit}</option>)}</select></div>;
    case "check": return <select aria-label="Check" value={String(step.check)} onChange={(event) => set("check", event.target.value)} style={input}>{catalog.checks.map((check) => <option key={check.key} value={check.key}>{check.label}</option>)}</select>;
    default: return null;
  }
}

export function Builder({ cat, users, rule, onSaved, onCancel }: { cat: Catalog; users: User[]; rule: Rule | null; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [trigger, setTrigger] = useState(rule?.trigger_type ?? cat.triggers[0]?.key ?? "");
  const [conditions, setConditions] = useState<Cond[]>(Array.isArray(rule?.conditions) ? rule.conditions : []);
  const [steps, setSteps] = useState<Step[]>(rule?.steps.length ? rule.steps : [newStep("create_task")]);
  const [reenroll, setReenroll] = useState(rule?.reenroll ?? "never");
  const [enabled, setEnabled] = useState(rule?.enabled ?? false);
  const [testMode, setTestMode] = useState(rule?.test_mode ?? false);
  const [error, setError] = useState<string | null>(null);
  const fields = cat.triggers.find(({ key }) => key === trigger)?.fields ?? [];
  const move = (index: number, offset: number) => setSteps((current) => { const next = [...current]; const [step] = next.splice(index, 1); next.splice(index + offset, 0, step as Step); return next; });
  async function save() {
    if (!name.trim()) return setError("Give the automation a name");
    const problem = steps.map((step, index) => stepProblem(step) ? `Step ${index + 1}: ${stepProblem(step)}` : null).find(Boolean);
    if (problem) return setError(problem);
    const body = { name: name.trim(), description: description.trim() || null, trigger_type: trigger, conditions: conditions.filter(({ field, op }) => field && op), steps, reenroll, enabled, test_mode: testMode };
    try { if (rule) await api.patch(`/api/automations/${rule.id}`, body); else await api.post("/api/automations", body); onSaved(); }
    catch (caught) { const detail = (caught as { details?: { error?: { message?: string; code?: string } } }).details?.error; setError(detail?.message || detail?.code || "Couldn't save. Only admins can change automations."); }
  }
  return <div style={card} data-testid="automation-builder"><div style={{ fontWeight: 700 }}>{rule ? "Edit automation" : "New automation"}</div><div style={{ display: "grid", gap: 10 }}>
    <input aria-label="Name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} style={input} /><input aria-label="Description" placeholder="What it is for (optional)" value={description} onChange={(event) => setDescription(event.target.value)} style={input} />
    <label style={small}>When <select aria-label="Trigger" value={trigger} onChange={(event) => { setTrigger(event.target.value); setConditions([]); }} style={input}>{cat.triggers.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
    <div><div style={small}>Only if (all must be true)</div>{conditions.map((condition, index) => { const update = (change: Partial<Cond>) => setConditions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...change } : item)); return <div key={index}><select aria-label="Field" value={condition.field} onChange={(event) => update({ field: event.target.value })} style={input}>{fields.map((key) => <option key={key} value={key}>{cat.fields[key]?.label ?? key}</option>)}</select><select aria-label="Operator" value={condition.op} onChange={(event) => update({ op: event.target.value })} style={input}>{cat.operators.map((operator) => <option key={operator} value={operator}>{OP_LABEL[operator] ?? operator}</option>)}</select>{!["is_set", "is_not_set"].includes(condition.op) && (cat.fields[condition.field]?.type === "stage" ? <select aria-label="Value" value={condition.value ?? ""} onChange={(event) => update({ value: event.target.value })} style={input}><option value="">Choose a stage</option>{cat.stages.map((stage) => <option key={stage}>{stage}</option>)}</select> : <input aria-label="Value" value={condition.value ?? ""} onChange={(event) => update({ value: event.target.value })} style={input} />)}<button type="button" style={btn} onClick={() => setConditions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>; })}{fields.length > 0 && <button type="button" style={btn} onClick={() => setConditions((items) => [...items, { field: fields[0] as string, op: "eq", value: "" }])}>+ Condition</button>}</div>
    <div><div style={small}>Then</div>{steps.map((step, index) => <div key={index} style={card}><select aria-label="Step type" value={step.type} onChange={(event) => setSteps((items) => items.map((item, itemIndex) => itemIndex === index ? newStep(event.target.value) : item))} style={input}>{cat.actions.map((action) => <option key={action.key} value={action.key}>{action.label}</option>)}</select><button type="button" style={btn} disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button><button type="button" style={btn} disabled={index === steps.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button><button type="button" style={btn} onClick={() => setSteps((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button><StepEditor step={step} catalog={cat} users={users} onChange={(next) => setSteps((items) => items.map((item, itemIndex) => itemIndex === index ? next : item))} /></div>)}<button type="button" style={btn} onClick={() => setSteps((items) => [...items, newStep("wait")])}>+ Step</button><div style={small}>Messages can use {"{{first_name}}"}, {"{{owner_name}}"}, {"{{stage}}"}, {"{{document_type}}"}.</div></div>
    <div><label>Run again for the same person <select aria-label="Re-enroll" value={reenroll} onChange={(event) => setReenroll(event.target.value)} style={input}><option value="never">Never</option><option value="after_complete">After it finishes</option><option value="always">Every time</option></select></label> <label><input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} /> Test mode (logs what it would do, sends nothing)</label> <label><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> On</label></div>
    <div style={small}>{describeRule({ trigger_type: trigger, conditions, steps }, cat)}</div>{error && <div style={{ color: "#ff3b30", fontSize: 13 }}>{error}</div>}<div><button type="button" style={primary} onClick={() => void save()}>Save</button> <button type="button" style={btn} onClick={onCancel}>Cancel</button></div>
  </div></div>;
}
