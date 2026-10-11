// BF_PORTAL_v786_WORKFLOW_BUILDER - the right-hand panel: "Choose an action" (search + grouped
// list), then the chosen step's Details form; also used to edit an existing step and the trigger.
// BF_PORTAL_v787_BUILDER_FIXES - triggers use the server catalog {type, label, group, filterFields}
// and keep params (date.relative {field, offsetDays, time}, no_reply {days}).
import { useMemo, useState, type ReactNode } from "react";
import { GROUPS, searchActions, type ActionDef } from "./actions";
import { NodeDetails, type FormContext } from "./DetailForms";
import { missingParams } from "./graph";
import { TRIGGER_GROUPS } from "./workflowApi";
import type { Catalog, Reenroll, Trigger, WorkflowNode } from "./types";
import { ConditionRows, Field, Icon, TEAL, btn, input, linkBtn, muted, primary } from "./ui";

export function PanelShell({ title, onClose, children, footer, testId = "side-panel" }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; testId?: string }) {
  return (
    <aside data-testid={testId} role="dialog" aria-label={title} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(440px, 100%)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderLeft: "1px solid var(--ui-border)", boxShadow: "var(--ui-shadow-strong)", display: "flex", flexDirection: "column", zIndex: 20 }}>
      <div style={{ background: TEAL, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>{title}</h2>
        <button type="button" aria-label="Close" onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", padding: 4 }}><Icon.close /></button>
      </div>
      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>{children}</div>
      {footer && <div style={{ padding: 12, borderTop: "1px solid var(--ui-border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>}
    </aside>
  );
}

export function ActionChooser({ onPick, onPaste, pasteLabel }: { onPick: (def: ActionDef) => void; onPaste?: () => void; pasteLabel?: string }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchActions(q), [q]);
  return (
    <div data-testid="action-chooser">
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 9, top: 9, color: "var(--ui-text-muted)" }}><Icon.search /></span>
        <input aria-label="Search actions" placeholder="Search actions" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, width: "100%", boxSizing: "border-box", paddingLeft: 28 }} autoFocus />
      </div>
      {onPaste && <button type="button" style={{ ...btn, width: "100%", marginBottom: 12 }} onClick={onPaste}>Paste copied action{pasteLabel ? ": " + pasteLabel : ""}</button>}
      {results.length === 0 && <div style={muted}>No actions match "{q}".</div>}
      {GROUPS.map((group) => {
        const items = results.filter((a) => a.group === group);
        if (!items.length) return null;
        return (
          <section key={group} style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--ui-text-muted)", margin: "0 0 6px" }}>{group}</h3>
            {items.map((a) => (
              <button key={a.key} type="button" onClick={() => onPick(a)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", marginBottom: 4, border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}>{a.label}</button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** Details form + Save for one step (new or existing). */
export function StepDetails({ initial, ctx, onSave, onBack, onClose, title }: { initial: WorkflowNode; ctx: FormContext; onSave: (n: WorkflowNode) => void; onBack?: () => void; onClose: () => void; title: string }) {
  const [draft, setDraft] = useState<WorkflowNode>(initial);
  const missing = missingParams(draft, ctx.nodes);
  return (
    <PanelShell title={title} onClose={onClose} footer={<>
      {onBack && <button type="button" style={btn} onClick={onBack}>Back</button>}
      <button type="button" style={btn} onClick={onClose}>Cancel</button>
      <button type="button" style={primary} onClick={() => onSave(draft)}>Save</button>
    </>}>
      <NodeDetails node={draft} onChange={setDraft} ctx={ctx} />
      {missing.length > 0 && (
        <div data-testid="missing-params" style={{ marginTop: 12, fontSize: 13, color: "var(--wf-danger)" }}>
          Changes needed: {missing.join("; ")}. You can save now and finish it later.
        </div>
      )}
    </PanelShell>
  );
}

export type InsertPanelProps = { ctx: FormContext; onInsert: (n: WorkflowNode) => void; onClose: () => void; onPaste?: () => void; pasteLabel?: string };

/** "+" flow: choose an action, then fill its Details; Save inserts it. */
export function InsertPanel({ ctx, onInsert, onClose, onPaste, pasteLabel }: InsertPanelProps) {
  const [picked, setPicked] = useState<ActionDef | null>(null);
  const [node, setNode] = useState<WorkflowNode | null>(null);
  if (picked && node) return <StepDetails key={picked.key} title={picked.label} initial={node} ctx={ctx} onSave={onInsert} onBack={() => { setPicked(null); setNode(null); }} onClose={onClose} />;
  return (
    <PanelShell title="Choose an action" onClose={onClose}>
      <ActionChooser onPick={(def) => { setPicked(def); setNode(def.make()); }} onPaste={onPaste} pasteLabel={pasteLabel} />
    </PanelShell>
  );
}

/** Date fields a date.relative trigger can watch: the catalog's date fields, else the ones BF-Server knows. */
const SERVER_DATE_FIELDS = [
  { key: "created_at", label: "Contact created date" },
  { key: "updated_at", label: "Contact last updated date" },
  { key: "dob", label: "Date of birth (yearly)" },
  { key: "booking_starts_at", label: "Booked call date" },
];
export function dateFields(catalog: Catalog): Array<{ key: string; label: string }> {
  const fromCatalog = catalog.fields.filter((f) => f.type === "date").map((f) => ({ key: f.key, label: f.label }));
  return fromCatalog.length ? fromCatalog : SERVER_DATE_FIELDS;
}

/** The params a new trigger of this type starts with. */
export function defaultTriggerParams(type: string): Record<string, unknown> | undefined {
  if (type === "date.relative") return { field: "", offsetDays: 0, time: "09:00" };
  if (type === "no_reply") return { days: 3 };
  return undefined;
}

function TriggerParams({ trigger, catalog, onChange }: { trigger: Trigger; catalog: Catalog; onChange: (params: Record<string, unknown>) => void }) {
  const p = trigger.params ?? {};
  const set = (k: string, v: unknown) => onChange({ ...p, [k]: v });
  if (trigger.type === "date.relative") {
    return (
      <div data-testid="trigger-params" style={{ marginBottom: 8 }}>
        <Field title="Date field">
          <select aria-label="Date field" value={String(p.field ?? "")} onChange={(e) => set("field", e.target.value)} style={{ ...input, width: "100%" }}>
            <option value="">Choose a date</option>
            {dateFields(catalog).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <Field title="Days after the date" hint="Use a negative number for days before.">
            <input aria-label="Days after the date" type="number" step={1} value={Number.isFinite(Number(p.offsetDays)) ? Number(p.offsetDays) : 0} onChange={(e) => set("offsetDays", Math.trunc(Number(e.target.value) || 0))} style={{ ...input, width: 110 }} />
          </Field>
          <Field title="At time">
            <input aria-label="Trigger time" type="time" value={String(p.time ?? "09:00")} onChange={(e) => set("time", e.target.value)} style={input} />
          </Field>
        </div>
      </div>
    );
  }
  if (trigger.type === "no_reply") {
    return (
      <div data-testid="trigger-params" style={{ marginBottom: 8 }}>
        <Field title="Days without a reply">
          <input aria-label="Days without a reply" type="number" min={1} value={Number(p.days) || ""} onChange={(e) => set("days", Math.max(1, Math.trunc(Number(e.target.value) || 1)))} style={{ ...input, width: 110 }} />
        </Field>
      </div>
    );
  }
  return null;
}

/** Trigger card editor: one or more triggers, each with filter rows, plus re-enrollment. */
export function TriggerPanel({ catalog, triggers, reenroll, onSave, onClose, issues = {} }: { catalog: Catalog; triggers: Trigger[]; reenroll: Reenroll; onSave: (t: Trigger[], r: Reenroll) => void; onClose: () => void; issues?: Record<string, string[]> }) {
  const [draft, setDraft] = useState<Trigger[]>(triggers);
  const [re, setRe] = useState<Reenroll>(reenroll);
  const [adding, setAdding] = useState(triggers.length === 0);
  const groups = TRIGGER_GROUPS.map((g) => ({ g, items: catalog.triggers.filter((t) => t.group === g) })).filter((x) => x.items.length);
  const update = (i: number, change: Partial<Trigger>) => setDraft((d) => d.map((t, idx) => (idx === i ? { ...t, ...change } : t)));
  return (
    <PanelShell testId="trigger-panel" title="Enrollment triggers" onClose={onClose} footer={<>
      <button type="button" style={btn} onClick={onClose}>Cancel</button>
      <button type="button" style={primary} onClick={() => onSave(draft, re)}>Save</button>
    </>}>
      <div style={{ ...muted, marginBottom: 10 }}>Contacts enroll when any of these triggers happens and its filters match.</div>
      {draft.map((t, i) => {
        const def = catalog.triggers.find((x) => x.type === t.type);
        const problems = issues["trigger:" + i] ?? [];
        return (
          <div key={i} data-testid="trigger-row" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ flex: 1, fontSize: 14 }}>{i > 0 ? "OR " : ""}{def?.label ?? t.type}</strong>
              <button type="button" style={linkBtn} onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
            <div style={{ ...muted, marginBottom: 4 }}>Only if</div>
            <TriggerParams trigger={t} catalog={catalog} onChange={(params) => update(i, { params })} />
            {problems.length > 0 && <div data-testid="trigger-issues" style={{ fontSize: 13, color: "var(--wf-danger)", marginBottom: 6 }}>{problems.join("; ")}</div>}
            <ConditionRows catalog={catalog} fieldKeys={def?.filterFields} conditions={t.filters} logic={t.filterLogic} onLogic={(filterLogic) => update(i, { filterLogic })} onChange={(filters) => update(i, { filters })} emptyText="No filters - every time it happens." />
          </div>
        );
      })}
      {adding ? (
        <div data-testid="trigger-picker" style={{ marginBottom: 12 }}>
          {groups.length === 0 && <div style={muted}>No triggers available.</div>}
          {groups.map(({ g, items }) => (
            <section key={g} style={{ marginBottom: 10 }}>
              <h3 style={{ fontSize: 12, textTransform: "uppercase", color: "var(--ui-text-muted)", margin: "0 0 6px" }}>{g}</h3>
              {items.map((t) => (
                <button key={t.type} type="button" onClick={() => { const params = defaultTriggerParams(t.type); setDraft((d) => [...d, { type: t.type, filters: [], filterLogic: "all", ...(params ? { params } : {}) }]); setAdding(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 4, border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 }}>{t.label}</button>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <button type="button" style={{ ...linkBtn, marginBottom: 12 }} onClick={() => setAdding(true)}>+ Add trigger</button>
      )}
      <Field title="Re-enrollment">
        <select aria-label="Re-enrollment" value={re} onChange={(e) => setRe(e.target.value as Reenroll)} style={{ ...input, width: "100%" }}>
          <option value="never">Off - a contact goes through once</option>
          <option value="after_complete">On - again after they finish</option>
          <option value="always">On - every time a trigger happens</option>
        </select>
      </Field>
    </PanelShell>
  );
}

