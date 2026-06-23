import type { CSSProperties } from "react";
import type { ReactNode } from "react";

type Props = { selectedCount: number; entityLabel: "contacts" | "companies"; onClear: () => void; onDelete: () => void; tagsControl: ReactNode; assignControl: ReactNode };
export default function MassActionBar({ selectedCount, entityLabel, onClear, onDelete, tagsControl, assignControl }: Props) { if (selectedCount <= 0) return null; return <div style={bar} data-testid={`mass-action-bar-${entityLabel}`}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><strong>{selectedCount} selected</strong><button type="button" style={clearBtn} onClick={onClear}>Clear</button></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><button type="button" style={deleteBtn} onClick={onDelete}>Delete</button>{tagsControl}{assignControl}</div></div>; }
const bar: CSSProperties = { position: "sticky", top: 0, zIndex: 2, width: "100%", background: "var(--ui-surface-muted)", padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 8 };
const clearBtn: CSSProperties = { border: 0, background: "transparent", color: "#0f766e", cursor: "pointer", textDecoration: "underline" };
const deleteBtn: CSSProperties = { border: 0, background: "#dc2626", color: "#fff", borderRadius: 6, padding: "8px 12px", fontWeight: 600, cursor: "pointer" };
