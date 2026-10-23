// BF_PORTAL_v849_KS_SILO - small shared pieces for the Keystone silo screens. Colours come from the portal's theme
// tokens (light and dark); badges use solid colours with white text, every pair 4.5:1 or better.
import type { CSSProperties, ReactNode } from "react";
import { KsOpsError } from "./ksApi";
import { KS_ACCENT } from "./ksAccess"; // white text on it: 7.1:1

export const card: CSSProperties = {
  background: "var(--ui-surface-strong)",
  border: "1px solid var(--ui-border)",
  borderRadius: 12,
  padding: 16,
  color: "var(--ui-text)",
};

export const input: CSSProperties = {
  minHeight: 36,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--ui-border)",
  background: "var(--ui-surface-input, var(--ui-surface))",
  color: "var(--ui-text)",
  fontSize: 14,
};

export const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ui-text-muted)",
  borderBottom: "1px solid var(--ui-border)",
  whiteSpace: "nowrap",
};

export const td: CSSProperties = {
  padding: "8px 10px",
  fontSize: 14,
  color: "var(--ui-text)",
  borderBottom: "1px solid var(--ui-border)",
  verticalAlign: "top",
};

export const linkStyle: CSSProperties = { color: "var(--ui-text)", fontWeight: 600, textDecoration: "underline" };

// Solid badge colours (white text): green 5.0, blue 6.7, amber 5.0, red 6.5, slate 7.6, violet 7.1.
const BADGE: Record<string, string> = {
  active: "#15803d",
  done: "#15803d",
  resolved: "#15803d",
  linked: "#15803d",
  synced: "#15803d",
  trial: "#1d4ed8",
  open: "#1d4ed8",
  normal: "#475569",
  provisioning: "#6D28D9",
  waiting: "#b45309",
  pending_payment: "#b45309",
  pending_sync: "#b45309",
  pending: "#b45309",
  high: "#b45309",
  past_due: "#b91c1c",
  suspended: "#b91c1c",
  urgent: "#b91c1c",
  error: "#b91c1c",
  failed: "#b91c1c",
  declined: "#475569",
  cancelled: "#475569",
  closed: "#475569",
  low: "#475569",
};

export function label(value: string | null | undefined): string {
  if (!value) return "-";
  const s = String(value).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Badge({ value }: { value: string | null | undefined }) {
  const bg = BADGE[String(value ?? "")] ?? "#475569";
  return (
    <span
      data-testid="ks-badge"
      style={{ display: "inline-block", background: bg, color: "#ffffff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {label(value)}
    </span>
  );
}

export function money(n: number | string | null | undefined, currency = "CAD"): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "-";
  return `${v.toLocaleString("en-CA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function cents(n: number | string | null | undefined, currency = "CAD"): string {
  return money(Number(n ?? 0) / 100, currency);
}

export function date(value: string | null | undefined, withTime = false): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime
    ? d.toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function Button({
  children,
  onClick,
  kind = "secondary",
  disabled,
  type = "button",
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  testId?: string;
}) {
  const bg = kind === "primary" ? KS_ACCENT : kind === "danger" ? "#b91c1c" : "transparent";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      style={{
        minHeight: 36,
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        background: bg,
        color: kind === "secondary" ? "var(--ui-text)" : "#ffffff",
        border: kind === "secondary" ? "1px solid var(--ui-border)" : "1px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

export function errorText(err: unknown): string {
  if (err instanceof KsOpsError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong.";
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const fields = error instanceof KsOpsError ? Object.entries(error.fieldErrors) : [];
  return (
    <div role="alert" style={{ ...card, borderColor: "var(--ui-text-danger)", color: "var(--ui-text-danger)", padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 600 }}>{errorText(error)}</div>
      {fields.length > 1 && (
        <ul style={{ margin: "6px 0 0 18px" }}>
          {fields.map(([k, v]) => (
            <li key={k}>
              {label(k)}: {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return <p style={{ color: "var(--ui-text-muted)" }}>Loading {what}...</p>;
}

export function Stat({ title, value, sub }: { title: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ ...card, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub ? <div style={{ fontSize: 13, color: "var(--ui-text-muted)", marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ui-text)" }}>{children}</h1>
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--ui-text-muted)", fontWeight: 600 }}>
      {name}
      {children}
    </label>
  );
}

export function KeyValues({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "minmax(140px, max-content) 1fr", gap: "6px 16px", margin: 0 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>{k}</dt>
          <dd style={{ margin: 0, fontSize: 14, wordBreak: "break-word" }}>{v ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty ? <p style={{ color: "var(--ui-text-muted)", fontSize: 14, margin: "10px 0 0" }}>Nothing here yet.</p> : null}
    </div>
  );
}

export function confirmAction(message: string): boolean {
  try {
    return window.confirm(message);
  } catch {
    return false;
  }
}
