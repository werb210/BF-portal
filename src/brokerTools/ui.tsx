// BF_PORTAL_v865_BROKER_TOOLS - shared look for the broker tools screens: the portal's card, heading, muted text, buttons, inputs
// and status chips (light and dark themes through the --ui-* tokens; chips use fixed dark-on-light colours).
import type { CSSProperties, ReactNode } from "react";

export const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
export const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };
export const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
export const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--ui-text)", fontWeight: 600, minWidth: 0 };
export const input: CSSProperties = { minHeight: 36, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-input)", color: "var(--ui-text)", fontSize: 14, fontFamily: "inherit", minWidth: 0 };
export const primaryButton: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
export const secondaryButton: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
export const dangerButton: CSSProperties = { ...secondaryButton, color: "var(--ui-text-danger)" };
export const row: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" };
export const table: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13, color: "var(--ui-text)" };
export const th: CSSProperties = { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--ui-border)", color: "var(--ui-text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
export const td: CSSProperties = { padding: "6px 8px", borderBottom: "1px solid var(--ui-border)", verticalAlign: "top" };

export type Tone = "green" | "amber" | "red" | "blue" | "grey";
const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  green: { bg: "#dcfce7", fg: "#14532d", border: "#86efac" },
  amber: { bg: "#fef3c7", fg: "#78350f", border: "#fcd34d" },
  red: { bg: "#fee2e2", fg: "#7f1d1d", border: "#fca5a5" },
  blue: { bg: "#dbeafe", fg: "#1e3a8a", border: "#93c5fd" },
  grey: { bg: "#f1f5f9", fg: "#1e293b", border: "#cbd5e1" },
};

export function Chip({ tone, children, testId }: { tone: Tone; children: ReactNode; testId?: string }) {
  const t = TONES[tone];
  return (
    <span data-testid={testId} style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, lineHeight: "18px", background: t.bg, color: t.fg, border: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function ErrorLine({ text }: { text: string | null }) {
  return text ? <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ui-text-danger)" }}>{text}</p> : null;
}

export const money = (v: unknown, digits = 2): string => {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export function errorText(e: unknown, fallback = "That did not work. Try again."): string {
  const m = e instanceof Error ? e.message : "";
  return m && m !== "API_ERROR" ? m : fallback;
}
