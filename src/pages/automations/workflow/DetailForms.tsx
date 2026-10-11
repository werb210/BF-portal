// BF_PORTAL_v786_WORKFLOW_BUILDER - the Details form for every kind of step.
import DOMPurify from "dompurify";
import { defOf, newId } from "./actions";
import { fieldLabel } from "./graph";
import type { Branch, BranchNode, Catalog, DelayNode, ListRef, UserRef, ValueBranchNode, WorkflowNode, WorkflowRef } from "./types";
import { ConditionRows, Field, Icon, ValueInput, iconBtn, input, linkBtn, muted } from "./ui";

export type FormContext = {
  catalog: Catalog;
  users: UserRef[];
  lists: ListRef[];
  workflows: WorkflowRef[];
  nodes: Record<string, WorkflowNode>;
  numbers: Record<string, number>;
  selfId?: string | null;
  workflowId?: string | null;
};

const DEFAULT_TOKENS = ["{{first_name}}", "{{last_name}}", "{{company_name}}", "{{owner_name}}", "{{stage}}"];
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const area: React.CSSProperties = { ...input, width: "100%", boxSizing: "border-box", fontFamily: "inherit", minHeight: 70 };
const full: React.CSSProperties = { ...input, width: "100%", boxSizing: "border-box" };

export function TokenHelp({ catalog }: { catalog: Catalog }) {
  const tokens = catalog.tokens.length ? catalog.tokens.map((t) => (t.startsWith("{{") ? t : "{{" + t + "}}")) : DEFAULT_TOKENS;
  return <div data-testid="token-help" style={{ ...muted, marginBottom: 12 }}>Personalize with tokens: {tokens.join(", ")}. A token with no value is left blank.</div>;
}

function UserSelect({ users, value, onChange, ariaLabel = "Person" }: { users: UserRef[]; value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  return (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} style={full}>
      <option value="">Choose a person</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}

function Recipient({ params, set, users }: { params: Record<string, unknown>; set: (k: string, v: unknown) => void; users: UserRef[] }) {
  return (
    <Field title="Send to">
      <select aria-label="Send to" value={str(params.to) || "owner"} onChange={(e) => set("to", e.target.value)} style={full}>
        <option value="owner">The contact owner</option>
        <option value="user">A specific person</option>
      </select>
      {str(params.to) === "user" && <div style={{ marginTop: 6 }}><UserSelect users={users} value={str(params.userId)} onChange={(v) => set("userId", v)} /></div>}
    </Field>
  );
}

export function BranchEditor({ node, onChange, catalog }: { node: BranchNode; onChange: (n: BranchNode) => void; catalog: Catalog }) {
  const setBranch = (i: number, change: Partial<Branch>) => onChange({ ...node, branches: node.branches.map((b, idx) => (idx === i ? { ...b, ...change } : b)) });
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= node.branches.length) return;
    const next = [...node.branches];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange({ ...node, branches: next });
  };
  return (
    <div data-testid="branch-editor">
      <div style={{ ...muted, marginBottom: 8 }}>Contacts go down the first branch whose conditions they meet. Anyone who meets none goes down "None met".</div>
      {node.branches.map((b, i) => (
        <div key={b.id} data-testid="branch-row" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <input aria-label={"Branch " + (i + 1) + " name"} value={b.label} onChange={(e) => setBranch(i, { label: e.target.value })} style={{ ...input, flex: 1 }} />
            <button type="button" style={iconBtn} aria-label={"Move branch " + (i + 1) + " up"} disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
            <button type="button" style={iconBtn} aria-label={"Move branch " + (i + 1) + " down"} disabled={i === node.branches.length - 1} onClick={() => move(i, 1)}>Down</button>
            <button type="button" style={iconBtn} aria-label={"Remove branch " + (i + 1)} disabled={node.branches.length === 1} onClick={() => onChange({ ...node, branches: node.branches.filter((_, idx) => idx !== i) })}><Icon.trash /></button>
          </div>
          <ConditionRows catalog={catalog} conditions={b.conditions} logic={b.logic} onLogic={(logic) => setBranch(i, { logic })} onChange={(conditions) => setBranch(i, { conditions })} />
        </div>
      ))}
      <button type="button" style={linkBtn} onClick={() => onChange({ ...node, branches: [...node.branches, { id: newId("b"), label: "Branch " + (node.branches.length + 1), logic: "all", conditions: [{ field: "", op: catalog.operators[0] ?? "eq", value: "" }], next: null }] })}>+ Add branch</button>
      <div style={{ ...muted, marginTop: 8 }}>"None met" is always the last branch.</div>
    </div>
  );
}

function ValueBranchEditor({ node, onChange, catalog }: { node: ValueBranchNode; onChange: (n: ValueBranchNode) => void; catalog: Catalog }) {
  const def = catalog.fields.find((f) => f.key === node.field);
  const options = def?.options.length ? def.options : def?.type === "stage" ? catalog.stages.map((s) => ({ value: s, label: s })) : [];
  const pickField = (field: string) => {
    const d = catalog.fields.find((f) => f.key === field);
    const opts = d?.options.length ? d.options : d?.type === "stage" ? catalog.stages.map((s) => ({ value: s, label: s })) : [];
    onChange({ ...node, field, cases: opts.map((o) => ({ id: newId("c"), label: o.label, value: o.value, next: null })) });
  };
  return (
    <div data-testid="value-branch-editor">
      <Field title="Branch on property">
        <select aria-label="Branch on property" value={node.field} onChange={(e) => pickField(e.target.value)} style={full}>
          <option value="">Choose a property</option>
          {catalog.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </Field>
      {node.field && <div style={{ ...muted, marginBottom: 6 }}>One branch per value of {fieldLabel(node.field, catalog)}, plus "None met".</div>}
      {node.cases.map((c, i) => (
        <div key={c.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input aria-label={"Case " + (i + 1) + " name"} value={c.label} onChange={(e) => onChange({ ...node, cases: node.cases.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })} style={{ ...input, flex: 1 }} />
          {options.length ? (
            <select aria-label={"Case " + (i + 1) + " value"} value={c.value} onChange={(e) => onChange({ ...node, cases: node.cases.map((x) => (x.id === c.id ? { ...x, value: e.target.value } : x)) })} style={input}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input aria-label={"Case " + (i + 1) + " value"} value={c.value} onChange={(e) => onChange({ ...node, cases: node.cases.map((x) => (x.id === c.id ? { ...x, value: e.target.value } : x)) })} style={input} />
          )}
          <button type="button" style={iconBtn} aria-label={"Remove case " + (i + 1)} onClick={() => onChange({ ...node, cases: node.cases.filter((x) => x.id !== c.id) })}><Icon.trash /></button>
        </div>
      ))}
      {node.field && <button type="button" style={linkBtn} onClick={() => onChange({ ...node, cases: [...node.cases, { id: newId("c"), label: "", value: options[0]?.value ?? "", next: null }] })}>+ Add value</button>}
    </div>
  );
}

const WEEKDAYS: Array<[string, string]> = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const UNITS = ["minutes", "hours", "days", "weeks"];

function DelayEditor({ node, onChange, catalog }: { node: DelayNode; onChange: (n: DelayNode) => void; catalog: Catalog }) {
  const p = node.params;
  const set = (k: string, v: unknown) => onChange({ ...node, params: { ...p, [k]: v } });
  if (node.mode === "duration") {
    return (
      <Field title="Delay for">
        <div style={{ display: "flex", gap: 6 }}>
          <input aria-label="Delay amount" type="number" min={1} value={Number(p.amount) || ""} onChange={(e) => set("amount", Number(e.target.value))} style={{ ...input, width: 90 }} />
          <select aria-label="Delay unit" value={str(p.unit) || "days"} onChange={(e) => set("unit", e.target.value)} style={input}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
        </div>
      </Field>
    );
  }
  if (node.mode === "until_time") {
    const days = Array.isArray(p.weekdays) ? (p.weekdays as string[]) : [];
    return (
      <>
        <Field title="Time of day"><input aria-label="Time of day" type="time" value={str(p.time)} onChange={(e) => set("time", e.target.value)} style={input} /></Field>
        <Field title="On these days" hint="Leave all unticked for the next day the time comes round.">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {WEEKDAYS.map(([key, name]) => (
              <label key={key} style={{ fontSize: 13, color: "var(--ui-text)" }}>
                <input type="checkbox" checked={days.includes(key)} onChange={(e) => set("weekdays", e.target.checked ? [...days, key] : days.filter((d) => d !== key))} /> {name}
              </label>
            ))}
          </div>
        </Field>
      </>
    );
  }
  return (
    <>
      <Field title="Wait until this happens">
        <select aria-label="Event" value={str(p.event)} onChange={(e) => set("event", e.target.value)} style={full}>
          <option value="">Choose an event</option>
          {(catalog.events.length ? catalog.events : catalog.triggers.map((t) => ({ key: t.key, label: t.label }))).map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
        </select>
      </Field>
      <Field title="Stop waiting after" hint='Two exits: "Event happened" and "Timed out".'>
        <div style={{ display: "flex", gap: 6 }}>
          <input aria-label="Timeout amount" type="number" min={1} value={Number(p.timeoutAmount) || ""} onChange={(e) => set("timeoutAmount", Number(e.target.value))} style={{ ...input, width: 90 }} />
          <select aria-label="Timeout unit" value={str(p.timeoutUnit) || "days"} onChange={(e) => set("timeoutUnit", e.target.value)} style={input}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
        </div>
      </Field>
    </>
  );
}

function EmailForm({ params, set, catalog }: { params: Record<string, unknown>; set: (k: string, v: unknown) => void; catalog: Catalog }) {
  const t = catalog.templates.email.find((x) => x.id === str(params.templateId));
  return (
    <>
      <Field title="Email template">
        <select aria-label="Email template" value={str(params.templateId)} onChange={(e) => set("templateId", e.target.value)} style={full}>
          <option value="">Choose a template</option>
          {catalog.templates.email.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </Field>
      {catalog.templates.email.length === 0 && <div style={{ ...muted, marginBottom: 12 }}>No email templates yet. Create one in Marketing first.</div>}
      {t && (
        <div data-testid="email-preview" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, marginBottom: 12, background: "var(--ui-surface-muted)", color: "var(--ui-text)" }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Subject: {t.subject || t.name}</div>
          {t.body ? <div style={{ fontSize: 13, maxHeight: 220, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t.body) }} /> : <div style={muted}>No preview available.</div>}
        </div>
      )}
      <TokenHelp catalog={catalog} />
    </>
  );
}

function SmsForm({ params, set, catalog }: { params: Record<string, unknown>; set: (k: string, v: unknown) => void; catalog: Catalog }) {
  const custom = !str(params.templateId);
  const t = catalog.templates.sms.find((x) => x.id === str(params.templateId));
  return (
    <>
      <Field title="Message">
        <select aria-label="SMS template" value={str(params.templateId)} onChange={(e) => set("templateId", e.target.value)} style={full}>
          <option value="">Write a custom message</option>
          {catalog.templates.sms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </Field>
      {custom ? (
        <Field title="Text message"><textarea aria-label="Text message" value={str(params.body)} onChange={(e) => set("body", e.target.value)} style={area} /></Field>
      ) : t?.body ? <div data-testid="sms-preview" style={{ ...muted, marginBottom: 12, whiteSpace: "pre-wrap" }}>{t.body}</div> : null}
      <Field title="Type">
        <select aria-label="Message type" value={str(params.purpose) || "transactional"} onChange={(e) => set("purpose", e.target.value)} style={full}>
          <option value="transactional">Transactional - about their application (always sent)</option>
          <option value="marketing">Marketing - only to people who agreed to marketing texts</option>
        </select>
      </Field>
      <TokenHelp catalog={catalog} />
    </>
  );
}

/** The Details form for one step. `onChange` receives the whole updated node. */
export function NodeDetails({ node, onChange, ctx }: { node: WorkflowNode; onChange: (n: WorkflowNode) => void; ctx: FormContext }) {
  const { catalog, users, lists, workflows } = ctx;
  if (node.kind === "branch") return <BranchEditor node={node} onChange={onChange} catalog={catalog} />;
  if (node.kind === "value_branch") return <ValueBranchEditor node={node} onChange={onChange} catalog={catalog} />;
  if (node.kind === "delay") return <DelayEditor node={node} onChange={onChange} catalog={catalog} />;
  if (node.kind === "goto") {
    const options = Object.entries(ctx.nodes).filter(([id, n]) => id !== ctx.selfId && n.kind !== "goto").sort((a, b) => (ctx.numbers[a[0]] ?? 999) - (ctx.numbers[b[0]] ?? 999));
    return (
      <Field title="Go to action" hint="Contacts jump to that step and carry on from there.">
        <select aria-label="Go to action" value={node.target} onChange={(e) => onChange({ ...node, target: e.target.value })} style={full}>
          <option value="">Choose an action</option>
          {options.map(([id, n]) => <option key={id} value={id}>{(ctx.numbers[id] ? ctx.numbers[id] + ". " : "") + (defOf(n)?.title ?? "Step")}</option>)}
        </select>
      </Field>
    );
  }
  const p = node.params;
  const set = (k: string, v: unknown) => onChange({ ...node, params: { ...p, [k]: v } });
  const text = (k: string, title: string, multiline = false) => (
    <Field title={title}>
      {multiline
        ? <textarea aria-label={title} value={str(p[k])} onChange={(e) => set(k, e.target.value)} style={area} />
        : <input aria-label={title} value={str(p[k])} onChange={(e) => set(k, e.target.value)} style={full} />}
    </Field>
  );
  switch (node.action) {
    case "send_email": return <EmailForm params={p} set={set} catalog={catalog} />;
    case "send_sms": return <SmsForm params={p} set={set} catalog={catalog} />;
    case "notify_client": return <>{text("title", "Title")}{text("body", "Message", true)}<div style={{ ...muted, marginBottom: 12 }}>Sent in the client app; by text when they have no app.</div><TokenHelp catalog={catalog} /></>;
    case "internal_email": return <><Recipient params={p} set={set} users={users} />{text("subject", "Subject")}{text("body", "Message", true)}<TokenHelp catalog={catalog} /></>;
    case "internal_sms":
    case "in_app_notification": return <><Recipient params={p} set={set} users={users} />{text("body", "Message", true)}<TokenHelp catalog={catalog} /></>;
    case "team_post": return <>{text("channel", "Channel (for example leads)")}{text("body", "Message", true)}<TokenHelp catalog={catalog} /></>;
    case "rotate_owner": {
      const ids = Array.isArray(p.userIds) ? (p.userIds as string[]) : [];
      return (
        <Field title="Rotate between" hint="Each new contact goes to the next person in turn.">
          <div style={{ display: "grid", gap: 4 }}>
            {users.map((u) => (
              <label key={u.id} style={{ fontSize: 13, color: "var(--ui-text)" }}>
                <input type="checkbox" checked={ids.includes(u.id)} onChange={(e) => set("userIds", e.target.checked ? [...ids, u.id] : ids.filter((x) => x !== u.id))} /> {u.name}
              </label>
            ))}
            {users.length === 0 && <span style={muted}>No staff found.</span>}
          </div>
        </Field>
      );
    }
    case "assign_owner": return <Field title="New owner"><UserSelect ariaLabel="New owner" users={users} value={str(p.userId)} onChange={(v) => set("userId", v)} /></Field>;
    case "create_task": return (
      <>
        {text("title", "Task title")}
        {text("body", "Notes (optional)", true)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field title="Type"><select aria-label="Task type" value={str(p.taskType) || "TODO"} onChange={(e) => set("taskType", e.target.value)} style={full}>{["TODO", "CALL", "EMAIL", "SMS"].map((v) => <option key={v} value={v}>{v === "TODO" ? "To-do" : v === "SMS" ? "Text" : v.charAt(0) + v.slice(1).toLowerCase()}</option>)}</select></Field>
          <Field title="Priority"><select aria-label="Priority" value={str(p.priority) || "MEDIUM"} onChange={(e) => set("priority", e.target.value)} style={full}>{["LOW", "MEDIUM", "HIGH"].map((v) => <option key={v} value={v}>{v.charAt(0) + v.slice(1).toLowerCase()}</option>)}</select></Field>
          <Field title="Due in (hours)"><input aria-label="Due in hours" type="number" min={0} value={Number(p.dueHours ?? 24)} onChange={(e) => set("dueHours", Number(e.target.value))} style={full} /></Field>
          <Field title="Assign to"><select aria-label="Assign to" value={str(p.assignTo) || "owner"} onChange={(e) => set("assignTo", e.target.value)} style={full}><option value="owner">The contact owner</option><option value="user">A specific person</option></select></Field>
        </div>
        {str(p.assignTo) === "user" && <Field title="Assignee"><UserSelect ariaLabel="Assignee" users={users} value={str(p.userId)} onChange={(v) => set("userId", v)} /></Field>}
      </>
    );
    case "add_note": return text("body", "Note", true);
    case "set_property": return (
      <>
        <Field title="Property">
          <select aria-label="Contact property" value={str(p.field)} onChange={(e) => onChange({ ...node, params: { ...p, field: e.target.value, value: "" } })} style={full}>
            <option value="">Choose a property</option>
            {catalog.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </Field>
        {str(p.field) && <Field title="New value"><ValueInput ariaLabel="New value" catalog={catalog} fieldKey={str(p.field)} value={str(p.value)} onChange={(v) => set("value", v)} /></Field>}
      </>
    );
    case "set_stage": return (
      <Field title="Application stage">
        <select aria-label="Application stage" value={str(p.stage)} onChange={(e) => set("stage", e.target.value)} style={full}>
          <option value="">Choose a stage</option>
          {catalog.stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
    );
    case "add_tag":
    case "remove_tag": return text("tag", "Tag");
    case "add_to_list":
    case "remove_from_list": return (
      <Field title="List" hint={lists.length ? undefined : "No lists yet. Lists are created from the Automations page."}>
        <select aria-label="List" value={str(p.listId)} onChange={(e) => set("listId", e.target.value)} style={full}>
          <option value="">Choose a list</option>
          {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
    );
    case "enroll_workflow": return (
      <Field title="Workflow">
        <select aria-label="Workflow" value={str(p.workflowId)} onChange={(e) => set("workflowId", e.target.value)} style={full}>
          <option value="">Choose a workflow</option>
          {workflows.filter((w) => w.id !== ctx.workflowId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
    );
    case "webhook": {
      const fields = Array.isArray(p.fields) ? (p.fields as Array<{ key: string; value: string }>) : [];
      const url = str(p.url);
      return (
        <>
          <Field title="Webhook address" hint="Must start with https://">
            <input aria-label="Webhook address" placeholder="https://" value={url} onChange={(e) => set("url", e.target.value)} style={full} />
          </Field>
          {url && !/^https:\/\//i.test(url) && <div role="alert" style={{ color: "var(--wf-danger)", fontSize: 13, marginBottom: 8 }}>Use an https:// address.</div>}
          <div style={{ ...muted, marginBottom: 6 }}>Fields sent in the JSON body (values can use tokens)</div>
          {fields.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input aria-label={"Field " + (i + 1) + " name"} placeholder="name" value={f.key} onChange={(e) => set("fields", fields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} style={{ ...input, flex: 1 }} />
              <input aria-label={"Field " + (i + 1) + " value"} placeholder="value" value={f.value} onChange={(e) => set("fields", fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} style={{ ...input, flex: 1 }} />
              <button type="button" style={iconBtn} aria-label={"Remove field " + (i + 1)} onClick={() => set("fields", fields.filter((_, j) => j !== i))}><Icon.trash /></button>
            </div>
          ))}
          <button type="button" style={linkBtn} onClick={() => set("fields", [...fields, { key: "", value: "" }])}>+ Add field</button>
        </>
      );
    }
    default: return <div style={muted}>This step has no settings.</div>;
  }
}
