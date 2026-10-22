// BF_PORTAL_v846_FRAUD - shared card, text and button styles for the fraud screens (theme variables, so they follow
// the light and dark portal themes).
import type { CSSProperties } from "react";

export const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
export const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
export const secondaryButton: CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};
