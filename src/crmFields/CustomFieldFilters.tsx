// BF_PORTAL_v870_CRM_DATA_MODEL - "Filter by field" for the contact, company and pipeline lists: pick a custom field, then a
// value that fits its type (one of the options, yes/no, contains, or a from-to range). Each filter shows as a chip
// with a remove button. The lists send them as cf_<name> parameters; the server does the filtering.
import { useState, type CSSProperties } from "react";
import { describeFilter, SELECT_TYPES, type CustomField, type CustomFilter } from "./customFieldsApi";

const wrap: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 12px" };
const control: CSSProperties = { padding: "6px 8px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13 };
const button: CSSProperties = { padding: "6px 12px", borderRadius: 6, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const chip: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 4px 3px 10px", borderRadius: 999, background: "#e0e7ff", color: "#1e3a8a", fontSize: 12, fontWeight: 600 };
const chipX: CSSProperties = { border: 0, background: "transparent", color: "#1e3a8a", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 6px" };

const RANGE: ReadonlySet<string> = new Set(["number", "money", "date"]);

export default function CustomFieldFilters({ fields, value, onChange }: { fields: CustomField[]; value: CustomFilter[]; onChange: (next: CustomFilter[]) => void }) {
  const [name, setName] = useState("");
  const [v, setV] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const usable = fields.filter((f) => !f.archived_at);
  if (!usable.length && !value.length) return null;
  const field = usable.find((f) => f.name === name);

  const add = () => {
    if (!field) return;
    const f: CustomFilter = { name: field.name, ...(v ? { value: v } : {}), ...(RANGE.has(field.field_type) && min ? { min } : {}), ...(RANGE.has(field.field_type) && max ? { max } : {}) };
    if (!f.value && !f.min && !f.max) return;
    onChange([...value.filter((x) => x.name !== f.name), f]);
    setName(""); setV(""); setMin(""); setMax("");
  };

  const valueControl = () => {
    if (!field) return null;
    if (SELECT_TYPES.has(field.field_type)) {
      return (
        <select aria-label="Value" style={control} value={v} onChange={(e) => setV(e.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          <option value="__empty__">(empty)</option>
        </select>
      );
    }
    if (field.field_type === "checkbox") {
      return (
        <select aria-label="Value" style={control} value={v} onChange={(e) => setV(e.target.value)}>
          <option value="">Choose…</option><option value="true">Yes</option><option value="false">No / not set</option>
        </select>
      );
    }
    if (RANGE.has(field.field_type)) {
      const type = field.field_type === "date" ? "date" : "text";
      return (
        <>
          <input aria-label="From" type={type} inputMode={type === "text" ? "decimal" : undefined} placeholder="From" style={{ ...control, width: 120 }} value={min} onChange={(e) => setMin(e.target.value)} />
          <input aria-label="To" type={type} inputMode={type === "text" ? "decimal" : undefined} placeholder="To" style={{ ...control, width: 120 }} value={max} onChange={(e) => setMax(e.target.value)} />
        </>
      );
    }
    return <input aria-label="Contains" placeholder="Contains…" style={control} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />;
  };

  return (
    <div style={wrap} data-testid="cf-filters">
      <select aria-label="Filter by field" style={control} value={name} onChange={(e) => { setName(e.target.value); setV(""); setMin(""); setMax(""); }}>
        <option value="">Filter by field…</option>
        {usable.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
      </select>
      {valueControl()}
      {field && <button type="button" style={button} onClick={add}>Add filter</button>}
      {value.map((f) => (
        <span key={f.name} style={chip}>
          {describeFilter(fields.find((x) => x.name === f.name), f)}
          <button type="button" style={chipX} aria-label={`Remove filter ${describeFilter(fields.find((x) => x.name === f.name), f)}`} onClick={() => onChange(value.filter((x) => x.name !== f.name))}>×</button>
        </span>
      ))}
    </div>
  );
}
