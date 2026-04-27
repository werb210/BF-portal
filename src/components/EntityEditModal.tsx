// BF_ENTITY_EDIT_MODAL_v24
import { useEffect, useState, type CSSProperties } from "react";

export type EntityField = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "number" | "textarea";
  required?: boolean;
};

type Props = {
  open: boolean;
  title: string;
  initial: Record<string, unknown>;
  fields: EntityField[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving?: boolean;
};

export function EntityEditModal({ open, title, initial, fields, onClose, onSave, saving = false }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initial ?? {});
    setError(null);
  }, [open, initial]);

  if (!open) return null;

  const disabled = busy || saving;

  return (
    <div role="dialog" aria-modal="true" style={overlay}>
      <div style={panel}>
        <div style={header}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        {error ? <div role="alert" style={errorStyle}>{error}</div> : null}

        {fields.map((field) => (
          <label key={field.key} style={fieldWrap}>
            <span style={fieldLabel}>{field.label}{field.required ? " *" : ""}</span>
            {field.type === "textarea" ? (
              <textarea
                value={String(form[field.key] ?? "")}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                rows={3}
                style={input}
              />
            ) : (
              <input
                type={field.type ?? "text"}
                value={String(form[field.key] ?? "")}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                style={input}
              />
            )}
          </label>
        ))}

        <div style={footer}>
          <button type="button" onClick={onClose} disabled={disabled} style={secondaryBtn}>Cancel</button>
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSave(form);
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to save changes.");
              } finally {
                setBusy(false);
              }
            }}
            disabled={disabled}
            style={primaryBtn}
          >
            {disabled ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1200,
};

const panel: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  width: "min(560px, 94vw)",
  maxHeight: "90vh",
  overflowY: "auto",
  padding: 20,
};

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const closeBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  fontSize: 24,
  lineHeight: 1,
  color: "#64748b",
};

const fieldWrap: CSSProperties = { display: "block", marginBottom: 10 };
const fieldLabel: CSSProperties = { display: "block", fontSize: 13, color: "#334155", marginBottom: 4 };
const input: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, boxSizing: "border-box" };
const errorStyle: CSSProperties = { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 };
const footer: CSSProperties = { marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 };
const secondaryBtn: CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "8px 12px", cursor: "pointer" };
const primaryBtn: CSSProperties = { border: 0, background: "#2563eb", color: "#fff", borderRadius: 6, padding: "8px 12px", cursor: "pointer" };
