// BF_PORTAL_v869_SETTINGS_PACK - shared look for the settings-pack tabs. Colours come from the theme variables (dark and
// light mode); the fixed colours (primary button, error and success boxes) are dark text on light fills or white on
// dark blue, all at least 4.5:1 contrast.
import type { CSSProperties, ReactNode } from "react";

export const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
export const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };
export const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 13, margin: "0 0 10px" };
export const input: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: "100%", boxSizing: "border-box" };
export const button: CSSProperties = { padding: "7px 14px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
export const quiet: CSSProperties = { padding: "5px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
export const danger: CSSProperties = { ...quiet, border: "1px solid #b91c1c", color: "#991b1b", background: "#fef2f2" };
export const cell: CSSProperties = { padding: "7px 10px", borderTop: "1px solid var(--ui-border)", fontSize: 13, color: "var(--ui-text)", textAlign: "left", verticalAlign: "top" };
export const row: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr", gap: 8, alignItems: "center", marginBottom: 8 };
const errorBox: CSSProperties = { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 };
const okBox: CSSProperties = { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#dcfce7", color: "#14532d", fontSize: 13 };

export function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section style={card} aria-labelledby={`${id}-h`} data-testid={id}>
      <h3 id={`${id}-h`} style={h3}>{title}</h3>
      {intro ? <p style={muted}>{intro}</p> : null}
      {children}
    </section>
  );
}

export function Notice({ error, ok }: { error?: string | null; ok?: string | null }) {
  return (
    <>
      {error ? <div role="alert" style={errorBox}>{error}</div> : null}
      {ok ? <div role="status" style={okBox}>{ok}</div> : null}
    </>
  );
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div style={row}>
      <label htmlFor={id} style={{ fontSize: 13 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

export function Toggle({ id, label, checked, onChange, disabled }: { id: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label htmlFor={id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "6px 0" }}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** The message of a failed api call: the server's field errors or message, else the fallback. */
export function errText(e: unknown, fallback: string): string {
  const err = e as { message?: string; details?: any; status?: number };
  const d = err?.details;
  if (d && typeof d === "object") {
    if (d.errors && typeof d.errors === "object") {
      const first = Object.values(d.errors).find((x) => typeof x === "string");
      if (first) return String(first);
    }
    if (typeof d.message === "string" && d.message) return d.message;
  }
  return err?.message && !/^(API_ERROR|Request failed)/.test(err.message) ? err.message : fallback;
}

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function when(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
