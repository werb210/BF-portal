// BF_PORTAL_v786_WORKFLOW_BUILDER - shared styles, icons and the condition-row editor.
import type { CSSProperties, ReactNode } from "react";
import { NO_VALUE_OPS, OP_LABEL } from "./graph";
import type { Catalog, Condition, Logic } from "./types";

export const NAVY = "#0B1F3A";
export const TEAL = "#0b5d66"; // white text on it is 7.2:1

export const input: CSSProperties = { padding: "7px 9px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", minWidth: 0 };
export const btn: CSSProperties = { padding: "6px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontSize: 13 };
export const primary: CSSProperties = { ...btn, background: TEAL, color: "#fff", border: "1px solid " + TEAL, fontWeight: 600 };
export const linkBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--wf-link)", cursor: "pointer", padding: 0, fontSize: 13, fontWeight: 600 };
export const muted: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)" };
export const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ui-text)", marginBottom: 4 };
export const iconBtn: CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "var(--ui-text-muted)", display: "inline-flex", alignItems: "center", borderRadius: 4 };

const svg = (path: ReactNode, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{path}</svg>
);
export const Icon = {
  pencil: () => svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
  copy: () => svg(<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  move: () => svg(<><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" /></>),
  clone: () => svg(<><rect x="3" y="3" width="13" height="13" rx="2" /><path d="M8 21h11a2 2 0 0 0 2-2V8" /></>),
  trash: () => svg(<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></>),
  close: () => svg(<path d="M18 6 6 18M6 6l12 12" />, 16),
  plus: () => svg(<path d="M12 5v14M5 12h14" />, 14),
  clock: () => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 16),
  branch: () => svg(<><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 7v10M6 12h10" /></>, 16),
  mail: () => svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>, 16),
  chat: () => svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />, 16),
  bell: () => svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></>, 16),
  user: () => svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, 16),
  task: () => svg(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m9 12 2 2 4-4" /></>, 16),
  edit: () => svg(<><path d="M4 20h16" /><path d="M14 4l6 6-9 9H5v-6Z" /></>, 16),
  list: () => svg(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>, 16),
  bolt: () => svg(<path d="M13 2 3 14h9l-1 8 10-12h-9Z" />, 16),
  search: () => svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></>, 14),
};

export function Field({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={label}>{title}</span>
      {children}
      {hint && <span style={{ ...muted, display: "block", marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

/** A value input that offers the field's options (or the stages) when the catalog has them. */
export function ValueInput({ catalog, fieldKey, value, onChange, ariaLabel = "Value" }: { catalog: Catalog; fieldKey: string; value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  const def = catalog.fields.find((f) => f.key === fieldKey);
  const options = def?.options.length ? def.options : def?.type === "stage" ? catalog.stages.map((st) => ({ value: st, label: st })) : [];
  if (options.length) {
    return (
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} style={input}>
        <option value="">Choose a value</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  const type = def?.type === "number" ? "number" : def?.type === "date" ? "date" : "text";
  return <input aria-label={ariaLabel} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Value" style={input} />;
}

/** Field picker restricted to `fieldKeys` when given (a trigger's own fields), else every field. */
export function ConditionRows({ catalog, conditions, onChange, fieldKeys, logic, onLogic, emptyText = "No conditions yet." }: {
  catalog: Catalog; conditions: Condition[]; onChange: (next: Condition[]) => void; fieldKeys?: string[]; logic?: Logic; onLogic?: (l: Logic) => void; emptyText?: string;
}) {
  const fields = fieldKeys && fieldKeys.length ? catalog.fields.filter((f) => fieldKeys.includes(f.key)) : catalog.fields;
  const update = (i: number, change: Partial<Condition>) => onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...change } : c)));
  return (
    <div data-testid="condition-rows">
      {onLogic && (
        <div style={{ marginBottom: 6 }}>
          <select aria-label="Match" value={logic ?? "all"} onChange={(e) => onLogic(e.target.value as Logic)} style={input}>
            <option value="all">All conditions are met (AND)</option>
            <option value="any">Any condition is met (OR)</option>
          </select>
        </div>
      )}
      {conditions.length === 0 && <div style={muted}>{emptyText}</div>}
      {conditions.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
          {i > 0 && <span style={{ ...muted, fontWeight: 700 }}>{logic === "any" ? "OR" : "AND"}</span>}
          <select aria-label="Property" value={c.field} onChange={(e) => update(i, { field: e.target.value, value: "" })} style={{ ...input, flex: "1 1 140px" }}>
            <option value="">Choose a property</option>
            {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select aria-label="Operator" value={c.op} onChange={(e) => update(i, { op: e.target.value })} style={input}>
            {catalog.operators.map((op) => <option key={op} value={op}>{OP_LABEL[op] ?? op}</option>)}
          </select>
          {!NO_VALUE_OPS.has(c.op) && <ValueInput catalog={catalog} fieldKey={c.field} value={c.value ?? ""} onChange={(v) => update(i, { value: v })} />}
          <button type="button" aria-label="Remove condition" style={iconBtn} onClick={() => onChange(conditions.filter((_, idx) => idx !== i))}><Icon.close /></button>
        </div>
      ))}
      <button type="button" style={linkBtn} onClick={() => onChange([...conditions, { field: "", op: catalog.operators[0] ?? "eq", value: "" }])}>+ Add condition</button>
    </div>
  );
}
