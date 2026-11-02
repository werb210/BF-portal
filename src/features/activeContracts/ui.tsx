// BF_PORTAL_v864_ACTIVE_CONTRACTS - shared look: money/date formatting, status pills (dark text on light fills so
// every label stays readable in both themes), cards and small form controls.
import type { CSSProperties, ReactNode } from "react";

export const money = (n: number | null | undefined, cents = false): string =>
  n === null || n === undefined || !Number.isFinite(Number(n)) ? "-"
    : Number(n).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 });
export const shortMoney = (n: number | null | undefined): string => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 10_000) return `$${Math.round(v / 1000)}K`;
  return money(v);
};
export const day = (s: string | null | undefined): string => {
  if (!s) return "n/a";
  const d = new Date(s.length === 10 ? `${s}T12:00:00Z` : s);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "n/a";
};
export const label = (s: string | null | undefined): string => (s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-");

const PILL: Record<string, { bg: string; fg: string }> = {
  active: { bg: "#dcfce7", fg: "#14532d" },
  renewal_upcoming: { bg: "#fef3c7", fg: "#78350f" },
  renewal_eligible: { bg: "#d1fae5", fg: "#064e3b" },
  renewal_in_progress: { bg: "#dbeafe", fg: "#1e3a8a" },
  refinanced: { bg: "#e0e7ff", fg: "#312e81" },
  paid_out: { bg: "#e5e7eb", fg: "#111827" },
  matured: { bg: "#e5e7eb", fg: "#111827" },
  closed: { bg: "#e5e7eb", fg: "#111827" },
  default: { bg: "#fee2e2", fg: "#7f1d1d" },
  estimated: { bg: "#f3f4f6", fg: "#374151" },
  pending: { bg: "#fef3c7", fg: "#78350f" },
};
export function Pill({ kind, children }: { kind: string; children: ReactNode }) {
  const c = PILL[kind] ?? PILL.estimated!;
  return <span style={{ display: "inline-block", background: c.bg, color: c.fg, borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Progress({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined) return <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>n/a</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 120 }} aria-label={`${pct}% paid`}>
      <span style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--ui-border)", overflow: "hidden", minWidth: 70 }}>
        <span style={{ display: "block", width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: "#16a34a" }} />
      </span>
      <span style={{ fontSize: 12, color: "var(--ui-text)" }}>{Math.round(pct)}%</span>
    </span>
  );
}

export const card: CSSProperties = { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border-soft, var(--ui-border))", borderRadius: 8, padding: 14 };
export const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
export const h3: CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "var(--ui-text)" };
export const input: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 6, padding: "6px 8px", fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", minWidth: 0 };
export const table: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13, color: "var(--ui-text)" };
export const th: CSSProperties = { textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--ui-text-muted)", padding: "8px 6px", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
export const td: CSSProperties = { padding: "8px 6px", borderBottom: "1px solid var(--ui-border-soft, var(--ui-border))", verticalAlign: "middle" };

export function Btn({ children, onClick, primary, disabled, type = "button", title }: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; type?: "button" | "submit"; title?: string }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      style={{ border: primary ? "1px solid #15803d" : "1px solid var(--ui-border)", background: primary ? "#15803d" : "var(--ui-surface-strong)", color: primary ? "#ffffff" : "var(--ui-text)",
        borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

export function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", fontSize: 13 }}>
      <span style={{ color: "var(--ui-text-muted)" }}>{k}</span>
      <span style={{ color: "var(--ui-text)", textAlign: "right" }}>{v}</span>
    </div>
  );
}

export function Field({ label: l, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "var(--ui-text-muted)" }}>{l}{children}</label>;
}

export function ErrorLine({ text }: { text: string | null }) {
  return text ? <div role="alert" style={{ color: "var(--ui-text-danger, #b91c1c)", fontSize: 13, margin: "6px 0" }}>{text}</div> : null;
}

/** Where the balance came from, always visible: "Estimated" or "Lender statement - Oct 1, 2026". */
export function balanceSource(b: { basis: string; source: string; as_of: string | null }): string {
  if (b.basis === "unknown") return "No balance yet";
  if (b.basis === "estimated") return "Estimated (amortization)";
  const src = b.source === "lender_statement" ? "Lender statement" : b.source === "lender_portal" ? "Lender portal" : b.source === "payoff" ? "Paid out" : "Updated by staff";
  return `${src} - ${day(b.as_of)}`;
}
