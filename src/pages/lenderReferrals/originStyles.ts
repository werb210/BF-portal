// BF_PORTAL_v828_APPLICATION_ORIGIN - the look of the "Where this came from" panel at the top of an application, on the
// UI guide: theme surfaces and text, a warning edge while a lender file waits for a decision, BF blue primary action.
import type { CSSProperties } from "react";

export const originBox = (needsDecision = false): CSSProperties => ({
  margin: "12px 20px 0", padding: 14, borderRadius: 10, flexShrink: 0,
  border: "1px solid var(--ui-border)", borderLeft: `4px solid ${needsDecision ? "#D9A23B" : "#1E3A8A"}`,
  background: "var(--ui-surface-strong)", color: "var(--ui-text)",
});
export const originKicker: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ui-text-muted)", marginBottom: 4 };
export const originButton: CSSProperties = {
  minHeight: 40, padding: "0 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
  border: "1px solid var(--ui-border)", background: "transparent", color: "var(--ui-text)",
};
export const originPrimary: CSSProperties = { ...originButton, background: "#1E3A8A", border: "1px solid #1E3A8A", color: "#fff" };
