// BF_PORTAL_v870_CRM_DATA_MODEL - Settings > Properties (Admins): the custom fields on contacts, companies and deals.
// Create, edit, order, group and archive them. Fields are never deleted: archiving hides one and keeps its values.
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  createField, FIELD_TYPE_LABEL, FIELD_TYPES, listFields, OBJECT_LABEL, reorderFields, SELECT_TYPES, setFieldArchived, updateField,
  type CustomField, type FieldType, type ObjectType,
} from "./customFieldsApi";

export const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
export const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };
export const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13, margin: "0 0 10px" };
export const cell: CSSProperties = { padding: "8px 10px", borderTop: "1px solid var(--ui-border)", fontSize: 13, color: "var(--ui-text)", textAlign: "left", verticalAlign: "top" };
export const headCell: CSSProperties = { ...cell, borderTop: "none", color: "var(--ui-text-muted)", fontWeight: 600, fontSize: 12, textTransform: "uppercase" };
export const input: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: "100%", boxSizing: "border-box" };
export const label: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ui-text)", marginBottom: 4 };
export const primary: CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
export const quiet: CSSProperties = { padding: "5px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
export const errorBox: CSSProperties = { margin: "8px 0", padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 };
export const okBox: CSSProperties = { margin: "8px 0", padding: "8px 10px", borderRadius: 8, background: "#dcfce7", color: "#14532d", fontSize: 13 };
const pill: CSSProperties = { display: "inline-block", padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "#e0e7ff", color: "#1e3a8a" };
const archivedPill: CSSProperties = { ...pill, background: "#e5e7eb", color: "#374151" };

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const OBJECTS: ObjectType[] = ["contact", "company", "application"];

type Draft = { id?: string; label: string; name: string; field_type: FieldType; options: string; required: boolean; group_name: string; description: string };
const emptyDraft = (): Draft => ({ label: "", name: "", field_type: "text", options: "", required: false, group_name: "", description: "" });
const slug = (s: string) => {
  const x = s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 63);
  return /^[a-z]/.test(x) ? x : x ? `f_${x}` : "";
};

function FieldForm({ object, draft, existing, onSaved, onCancel }: { object: ObjectType; draft: Draft; existing?: CustomField; onSaved: (f: CustomField) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [nameTouched, setNameTouched] = useState(Boolean(draft.id));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(d.id);
  const set = (k: keyof Draft, v: string | boolean) => setD((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!d.label.trim()) return setErr("Give the field a label.");
    const lines = d.options.split("\n").map((x) => x.trim()).filter(Boolean);
    // Existing options keep their stored value by position, so editing a line renames it rather than replacing it.
    const options = lines.map((l, i) => (existing && existing.options[i] ? { value: existing.options[i].value, label: l } : l));
    if (SELECT_TYPES.has(d.field_type) && !options.length) return setErr("Add at least one option, one per line.");
    setBusy(true);
    try {
      const body = {
        label: d.label.trim(), field_type: d.field_type, required: d.required, group_name: d.group_name.trim(), description: d.description.trim(),
        ...(SELECT_TYPES.has(d.field_type) ? { options } : {}),
      };
      const saved = editing ? await updateField(object, d.id!, body) : await createField(object, { ...body, name: d.name.trim() || slug(d.label) });
      onSaved(saved);
    } catch (e2) {
      setErr(errText(e2, "Could not save the field."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} aria-label={editing ? "Edit field" : "New field"} style={{ ...card, background: "var(--ui-surface)" }}>
      <h3 style={h3}>{editing ? `Edit "${draft.label}"` : `New ${OBJECT_LABEL[object].toLowerCase()} field`}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div>
          <label style={label} htmlFor="cf-label">Label</label>
          <input id="cf-label" autoFocus style={input} value={d.label} maxLength={80}
            onChange={(e) => { set("label", e.target.value); if (!nameTouched) set("name", slug(e.target.value)); }} />
        </div>
        <div>
          <label style={label} htmlFor="cf-name">Internal name</label>
          <input id="cf-name" style={{ ...input, ...(editing ? { background: "var(--ui-surface-muted)" } : {}) }} value={d.name} disabled={editing}
            onChange={(e) => { setNameTouched(true); set("name", e.target.value.toLowerCase()); }} />
          <span style={{ ...muted, fontSize: 12 }}>{editing ? "Fixed once the field exists." : "Used by imports, exports, filters and the API."}</span>
        </div>
        <div>
          <label style={label} htmlFor="cf-type">Type</label>
          <select id="cf-type" style={input} value={d.field_type} onChange={(e) => set("field_type", e.target.value)}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div>
          <label style={label} htmlFor="cf-group">Group</label>
          <input id="cf-group" style={input} value={d.group_name} maxLength={60} placeholder="e.g. Broker details" onChange={(e) => set("group_name", e.target.value)} />
        </div>
      </div>
      {SELECT_TYPES.has(d.field_type) && (
        <div style={{ marginTop: 12 }}>
          <label style={label} htmlFor="cf-options">Options (one per line)</label>
          <textarea id="cf-options" style={{ ...input, minHeight: 90 }} value={d.options} onChange={(e) => set("options", e.target.value)} />
          {editing && <span style={{ ...muted, fontSize: 12 }}>Edit a line to rename that option; add new ones at the end. Options already saved can't be removed.</span>}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <label style={label} htmlFor="cf-description">Help text</label>
        <input id="cf-description" style={input} value={d.description} maxLength={300} onChange={(e) => set("description", e.target.value)} />
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "var(--ui-text)" }}>
        <input type="checkbox" checked={d.required} onChange={(e) => set("required", e.target.checked)} /> Required when staff edit the record
      </label>
      {err && <div role="alert" style={errorBox}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="submit" style={primary} disabled={busy}>{busy ? "Saving…" : editing ? "Save field" : "Create field"}</button>
        <button type="button" style={quiet} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function PropertiesSettings() {
  const [object, setObject] = useState<ObjectType>("contact");
  const [fields, setFields] = useState<CustomField[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try { setFields(await listFields(object, true)); } catch (e) { setErr(errText(e, "Could not load the fields.")); setFields([]); }
  }, [object]);
  useEffect(() => { setFields(null); setDraft(null); setOk(null); void load(); }, [load]);

  const shown = useMemo(() => (fields ?? []).filter((f) => showArchived || !f.archived_at), [fields, showArchived]);
  const activeCount = (fields ?? []).filter((f) => !f.archived_at).length;

  const toggleArchive = async (f: CustomField) => {
    setErr(null); setOk(null);
    if (!f.archived_at && !window.confirm(`Archive "${f.label}"? It disappears from records, lists and imports. Values already saved are kept and come back if you unarchive it.`)) return;
    try {
      await setFieldArchived(object, f.id, !f.archived_at);
      setOk(f.archived_at ? `"${f.label}" is back.` : `"${f.label}" archived. Its values are kept.`);
      await load();
    } catch (e) { setErr(errText(e, "Could not change the field.")); }
  };

  const move = async (f: CustomField, dir: -1 | 1) => {
    const list = (fields ?? []).filter((x) => !x.archived_at);
    const i = list.findIndex((x) => x.id === f.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = [...list];
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    try { await reorderFields(object, next.map((x) => x.id)); await load(); } catch (e) { setErr(errText(e, "Could not change the order.")); }
  };

  return (
    <div>
      <section style={card} aria-labelledby="props-h">
        <h3 id="props-h" style={h3}>Properties</h3>
        <p style={muted}>
          Add your own fields to contacts, companies and deals: licence numbers, renewal dates, equipment type and so on. They show
          on each record, as list columns and filters, in CSV exports and the data export, and the importer can fill them
          (HubSpot custom properties are matched by name). Up to 100 fields in use per record type. Fields are never deleted; archive
          one to hide it and keep its values.
        </p>
        <div role="tablist" aria-label="Record type" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {OBJECTS.map((o) => (
            <button key={o} type="button" role="tab" aria-selected={o === object} onClick={() => setObject(o)}
              style={o === object ? { ...primary, padding: "6px 12px" } : { ...quiet, padding: "6px 12px", fontSize: 13 }}>{OBJECT_LABEL[o]}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <button type="button" style={primary} onClick={() => { setOk(null); setDraft(emptyDraft()); }} data-testid="cf-new">+ New field</button>
          <label style={{ fontSize: 13, color: "var(--ui-text)", display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
          </label>
          <span style={{ ...muted, margin: 0 }}>{activeCount} of 100 in use</span>
        </div>
        {err && <div role="alert" style={errorBox}>{err}</div>}
        {ok && <div role="status" style={okBox}>{ok}</div>}
        {draft && (
          <FieldForm key={draft.id ?? "new"} object={object} draft={draft} existing={(fields ?? []).find((f) => f.id === draft.id)} onCancel={() => setDraft(null)}
            onSaved={(f) => { setDraft(null); setOk(`"${f.label}" saved.`); void load(); }} />
        )}
        {fields === null ? <p style={muted}>Loading…</p> : shown.length === 0 ? (
          <p style={muted}>No custom fields on {OBJECT_LABEL[object].toLowerCase()} yet. Press + New field to add one.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={headCell}>Label</th><th style={headCell}>Internal name</th><th style={headCell}>Type</th>
                <th style={headCell}>Group</th><th style={headCell}>Required</th><th style={headCell}>Actions</th>
              </tr></thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id} data-testid={`cf-row-${f.name}`}>
                    <td style={cell}>
                      <strong>{f.label}</strong> {f.archived_at && <span style={archivedPill}>Archived</span>}
                      {f.description && <div style={{ ...muted, margin: 0 }}>{f.description}</div>}
                    </td>
                    <td style={cell}><code>{f.name}</code></td>
                    <td style={cell}>{FIELD_TYPE_LABEL[f.field_type]}{SELECT_TYPES.has(f.field_type) ? ` (${f.options.length})` : ""}</td>
                    <td style={cell}>{f.group_name ?? "-"}</td>
                    <td style={cell}>{f.required ? "Yes" : "No"}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>
                      {!f.archived_at && <>
                        <button type="button" style={quiet} aria-label={`Move ${f.label} up`} onClick={() => void move(f, -1)}>Up</button>{" "}
                        <button type="button" style={quiet} aria-label={`Move ${f.label} down`} onClick={() => void move(f, 1)}>Down</button>{" "}
                        <button type="button" style={quiet} onClick={() => { setOk(null); setDraft({ id: f.id, label: f.label, name: f.name, field_type: f.field_type, options: f.options.map((o) => o.label).join("\n"), required: f.required, group_name: f.group_name ?? "", description: f.description ?? "" }); }}>Edit</button>{" "}
                      </>}
                      <button type="button" style={quiet} onClick={() => void toggleArchive(f)}>{f.archived_at ? "Unarchive" : "Archive"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
