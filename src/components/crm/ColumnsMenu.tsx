// CRM_EDIT_COLUMNS — shared column-visibility menu. Renders an "Edit columns"
// button that opens a checkbox list; unchecked columns are reported via `hidden`.
import { useState, type CSSProperties } from "react";

export type ColumnOption = { key: string; label: string };

export default function ColumnsMenu({
  options,
  hidden,
  onToggle,
  style,
}: {
  options: ColumnOption[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={style} data-testid="edit-columns">Edit columns</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
          <div style={menu}>
            {options.map((o) => (
              <label key={o.key} style={rowStyle}>
                <input type="checkbox" checked={!hidden.has(o.key)} onChange={() => onToggle(o.key)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const menu: CSSProperties = { position: "absolute", top: "100%", right: 0, marginTop: 4, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 8, zIndex: 50, minWidth: 190, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" };
const rowStyle: CSSProperties = { display: "flex", gap: 8, alignItems: "center", padding: "4px 6px", fontSize: 13, color: "#33475b", cursor: "pointer", whiteSpace: "nowrap" };
