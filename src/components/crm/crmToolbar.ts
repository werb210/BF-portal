// BF_PORTAL_CRM_TOOLBAR_ONE_ROW_v1 - one look for the CRM list toolbars (contacts and companies, every business): every
// control is the same height, font and corner, labels are short, and the row stays on one line on a laptop screen.
import type { CSSProperties } from "react";

const base: CSSProperties = {
  height: 36, boxSizing: "border-box", padding: "0 12px", fontSize: 14, lineHeight: "normal", fontWeight: 500,
  border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)",
  whiteSpace: "nowrap", flex: "0 0 auto",
};

export const crmToolbar: CSSProperties = { display: "flex", flexWrap: "nowrap", alignItems: "center", gap: 8, marginBottom: 16, minWidth: 0 };
export const crmSearch: CSSProperties = { ...base, flex: "1 1 160px", minWidth: 120, width: "auto" };
export const crmSelect: CSSProperties = { ...base, maxWidth: 170, paddingRight: 8, cursor: "pointer" };
export const crmButton: CSSProperties = { ...base, cursor: "pointer" };
export const crmPrimary: CSSProperties = { ...base, background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", fontWeight: 600, cursor: "pointer" };
