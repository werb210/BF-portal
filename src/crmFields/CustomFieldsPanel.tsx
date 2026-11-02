// BF_PORTAL_v870_CRM_DATA_MODEL - a record's custom fields on its page (contact, company, application): read, then Edit to
// change them with validation. Archived fields that still hold a value are shown read-only. Nothing renders when the
// brokerage has no custom fields for this record type.
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { ApiError } from "@/api/http";
import {
  checkValue, displayValue, getRecordValues, groupFields, isEmpty, saveRecordValues, type CustomField, type ObjectType, type Values,
} from "./customFieldsApi";

const box: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", margin: "12px 0" };
const head: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 };
const title: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ui-text)" };
const groupTitle: CSSProperties = { margin: "12px 0 6px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--ui-text-muted)" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px 16px" };
const fieldLabel: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 3 };
const valueText: CSSProperties = { fontSize: 14, color: "var(--ui-text)", wordBreak: "break-word", whiteSpace: "pre-wrap" };
const input: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: "100%", boxSizing: "border-box" };
const invalid: CSSProperties = { ...input, border: "1px solid #b91c1c" };
const fieldError: CSSProperties = { color: "#b91c1c", fontSize: 12, marginTop: 3 };
const primary: CSSProperties = { padding: "6px 14px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const quiet: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const errorBox: CSSProperties = { margin: "8px 0", padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 };

/** Form state: everything as the input shows it (strings, booleans, string[]). */
type FormValues = Record<string, unknown>;

function toForm(fields: CustomField[], values: Values): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.field_type === "checkbox") out[f.name] = v === true ? "true" : v === false ? "false" : "";
    else if (f.field_type === "multi_select") out[f.name] = Array.isArray(v) ? v : [];
    else out[f.name] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

function fromForm(f: CustomField, v: unknown): unknown {
  if (f.field_type === "checkbox") return v === "true" ? true : v === "false" ? false : null;
  if (f.field_type === "multi_select") return Array.isArray(v) && v.length ? v : null;
  return isEmpty(v) ? null : v;
}

function FieldInput({ field, value, error, onChange }: { field: CustomField; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const id = `cfv-${field.name}`;
  const style = error ? invalid : input;
  const common = { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-err` : undefined } as const;
  switch (field.field_type) {
    case "long_text":
      return <textarea {...common} style={{ ...style, minHeight: 70 }} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "number": case "money":
      return <input {...common} style={style} inputMode="decimal" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={field.field_type === "money" ? "0.00" : ""} />;
    case "date":
      return <input {...common} type="date" style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "checkbox":
      return (
        <select {...common} style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">Not set</option><option value="true">Yes</option><option value="false">No</option>
        </select>
      );
    case "single_select":
      return (
        <select {...common} style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">Not set</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "multi_select": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div id={id} role="group" aria-label={field.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {field.options.map((o) => (
            <label key={o.value} style={{ fontSize: 13, color: "var(--ui-text)", display: "inline-flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={list.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...list, o.value] : list.filter((x) => x !== o.value))} />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    case "email":
      return <input {...common} type="email" style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "url":
      return <input {...common} type="url" style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="https://" />;
    case "phone":
      return <input {...common} type="tel" style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input {...common} style={style} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} maxLength={1000} />;
  }
}

function ReadValue({ field, value }: { field: CustomField; value: unknown }) {
  const text = displayValue(field, value);
  if (!text) return <span style={{ ...valueText, color: "var(--ui-text-muted)" }}>-</span>;
  if (field.field_type === "url") return <a href={String(value)} target="_blank" rel="noopener noreferrer" style={{ ...valueText, color: "#1d4ed8" }}>{text}</a>;
  if (field.field_type === "email") return <a href={`mailto:${text}`} style={{ ...valueText, color: "#1d4ed8" }}>{text}</a>;
  return <span style={valueText}>{text}</span>;
}

export default function CustomFieldsPanel({ object, recordId, canEdit = true }: { object: ObjectType; recordId: string; canEdit?: boolean }) {
  const [fields, setFields] = useState<CustomField[] | null>(null);
  const [values, setValues] = useState<Values>({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getRecordValues(object, recordId);
      setFields(Array.isArray(r?.fields) ? r.fields : []);
      setValues(r?.values ?? {});
    } catch {
      setFields([]); // no access, no fields or an older server: show nothing rather than an error on the record page
    }
  }, [object, recordId]);
  useEffect(() => { void load(); }, [load]);

  if (!fields || fields.length === 0) return null;
  const editable = fields.filter((f) => !f.archived_at);

  const start = () => { setForm(toForm(editable, values)); setErrors({}); setErr(null); setEditing(true); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const out: Values = {};
    for (const f of editable) {
      const v = fromForm(f, form[f.name]);
      const problem = checkValue(f, v);
      if (problem) next[f.name] = problem;
      out[f.name] = v;
    }
    setErrors(next);
    if (Object.keys(next).length) { setErr("Fix the highlighted fields."); return; }
    setBusy(true);
    setErr(null);
    try {
      setValues(await saveRecordValues(object, recordId, out));
      setEditing(false);
    } catch (e2) {
      const details = e2 instanceof ApiError ? (e2.details as { errors?: Array<{ field: string; error: string }> } | undefined) : undefined;
      if (details?.errors?.length) setErrors(Object.fromEntries(details.errors.map((x) => [x.field, x.error])));
      setErr(e2 instanceof Error && e2.message ? e2.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={box} aria-labelledby={`cf-${object}-h`} data-testid="custom-fields-panel">
      <div style={head}>
        <h3 id={`cf-${object}-h`} style={title}>Custom fields</h3>
        {canEdit && !editing && editable.length > 0 && <button type="button" style={quiet} onClick={start}>Edit</button>}
      </div>
      {editing ? (
        <form onSubmit={save} noValidate>
          {groupFields(editable).map(([group, list]) => (
            <div key={group || "_"}>
              {group && <h4 style={groupTitle}>{group}</h4>}
              <div style={grid}>
                {list.map((f) => (
                  <div key={f.name}>
                    <label htmlFor={`cfv-${f.name}`} style={fieldLabel}>{f.label}{f.required ? " *" : ""}</label>
                    <FieldInput field={f} value={form[f.name]} error={errors[f.name]} onChange={(v) => setForm((p) => ({ ...p, [f.name]: v }))} />
                    {f.description && !errors[f.name] && <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 3 }}>{f.description}</div>}
                    {errors[f.name] && <div id={`cfv-${f.name}-err`} style={fieldError}>{errors[f.name]}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {err && <div role="alert" style={errorBox}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" style={primary} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" style={quiet} onClick={() => { setEditing(false); setErr(null); setErrors({}); }}>Cancel</button>
          </div>
        </form>
      ) : (
        groupFields(fields).map(([group, list]) => (
          <div key={group || "_"}>
            {group && <h4 style={groupTitle}>{group}</h4>}
            <div style={grid}>
              {list.map((f) => (
                <div key={f.name}>
                  <span style={fieldLabel}>{f.label}{f.archived_at ? " (archived)" : ""}</span>
                  <ReadValue field={f} value={values[f.name]} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
