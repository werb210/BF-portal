// BF_PORTAL_v941_FINANCIALS_FROM_STATEMENTS - Todd's screenshot review (Nov 11 2026): the Financials tab showed the
// per-document OCR fields, which read 2022's revenue as "$7". The figures that matter are the ones the credit summary
// uses: each year's statements read in full (BF-Server /api/credit-financials). Shown here by year, with "Read the
// statements" and a correction box on each figure. A corrected figure is kept when the statements are read again.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Period = { label: string; periodEnd: string | null; kind: "annual" | "interim" | "forecast" };
type Row = { item: string; values: (number | null)[]; derived: boolean; edited: boolean[] };
type Table = { periods: Period[]; rows: Row[] };

export const ITEM_LABEL: Record<string, string> = {
  revenue: "Revenue", gross_margin: "Gross margin", ebitda: "EBITDA", ebitda_plus_rent: "EBITDA + rent", net_income: "Net income",
  total_debt_service: "Total debt service", dscr: "DSCR", current_assets: "Current assets", current_liabilities: "Current liabilities",
  current_ratio: "Current ratio", accounts_receivable: "Accounts receivable", inventory: "Inventory", ppe_net: "Fixed assets (net)",
  long_term_debt: "Long-term debt", equity: "Equity", debt_to_equity: "Debt to equity",
};
const RATIOS = new Set(["dscr", "current_ratio", "debt_to_equity"]);
const EDITABLE = new Set(["revenue", "net_income", "current_assets", "current_liabilities", "accounts_receivable", "inventory", "ppe_net", "long_term_debt", "equity"]);

export function figure(item: string, v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (RATIOS.has(item)) return `${v.toFixed(2)}x`;
  const s = Math.abs(v).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  return v < 0 ? `(${s})` : s;
}

// BF_PORTAL_v947 - the card sets its own text colour. Without it the figures took the page's white text and vanished
// on the white card (Todd, Nov 12 2026).
const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 12, padding: 16, background: "var(--ui-surface-strong)", marginBottom: 16, color: "var(--ui-text)" };
const th: CSSProperties = { textAlign: "right", padding: "6px 10px", fontSize: 12, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
const td: CSSProperties = { textAlign: "right", padding: "6px 10px", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
const btn: CSSProperties = { padding: "7px 12px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };

export default function StatementFigures({ applicationId }: { applicationId: string }) {
  const [table, setTable] = useState<Table | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<{ item: string; period: Period; value: string } | null>(null);

  const load = useCallback(async () => {
    try { const r = await api.get<{ table?: Table }>(`/api/credit-financials/${encodeURIComponent(applicationId)}`); setTable(r?.table ?? { periods: [], rows: [] }); }
    catch { setTable({ periods: [], rows: [] }); }
  }, [applicationId]);
  useEffect(() => { if (applicationId) void load(); }, [applicationId, load]);

  async function read() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ table?: Table; documents?: number; skipped?: string[] }>(`/api/credit-financials/${encodeURIComponent(applicationId)}/extract`, {});
      if (r?.table) setTable(r.table);
      setMsg({ ok: true, text: r?.documents ? `Read ${r.documents} statement${r.documents === 1 ? "" : "s"}.${r.skipped?.length ? ` Not read yet: ${r.skipped.join("; ")}` : ""}` : "No financial statements were found on this file." });
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The statements could not be read. Try again.") }); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!editing) return;
    try {
      const r = await api.put<{ table?: Table }>(`/api/credit-financials/${encodeURIComponent(applicationId)}/cell`, {
        period: editing.period.label, kind: editing.period.kind, periodEnd: editing.period.periodEnd, item: editing.item, value: editing.value.trim() === "" ? null : editing.value,
      });
      if (r?.table) setTable(r.table);
      setEditing(null);
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "That figure could not be saved.") }); }
  }

  return (
    <section style={card} data-testid="statement-figures">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Figures from the financial statements</h3>
        <span style={{ flex: 1 }} />
        <button type="button" style={btn} disabled={busy} onClick={() => void read()} data-testid="read-statements">{busy ? "Reading…" : table?.rows.length ? "Read the statements again" : "Read the statements"}</button>
      </div>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "6px 0 0" }}>Each year comes from that year's own statements. Click a figure to correct it; corrections are kept when the statements are read again. These are the figures the credit summary uses.</p>
      {msg ? <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</p> : null}
      {table === null ? <p style={{ fontSize: 13 }}>Loading…</p> : table.rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }} data-testid="statement-figures-empty">The statements have not been read yet.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table data-testid="statement-figures-table" style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, color: "var(--ui-text)" }}>
            <thead><tr><th style={{ ...th, textAlign: "left" }}>Line</th>{table.periods.map((p) => <th key={p.label} style={th}>{p.label}{p.kind !== "annual" ? ` (${p.kind})` : ""}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.item}>
                  <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{ITEM_LABEL[row.item] ?? row.item}</td>
                  {row.values.map((v, i) => {
                    const p = table.periods[i]!;
                    const isEditing = editing && editing.item === row.item && editing.period.label === p.label;
                    const canEdit = EDITABLE.has(row.item);
                    return (
                      <td key={p.label} style={td}>
                        {isEditing ? (
                          <span style={{ display: "inline-flex", gap: 4 }}>
                            <input aria-label={`${ITEM_LABEL[row.item]} ${p.label}`} autoFocus value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setEditing(null); }} style={{ width: 120, padding: "3px 6px", textAlign: "right" }} />
                            <button type="button" onClick={() => void save()} style={{ ...btn, padding: "3px 8px" }}>Save</button>
                          </span>
                        ) : canEdit ? (
                          <button type="button" title="Click to correct" onClick={() => setEditing({ item: row.item, period: p, value: v === null ? "" : String(v) })} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", font: "inherit", padding: 0 }}>
                            {figure(row.item, v)}{row.edited[i] ? <span title="Corrected by staff" style={{ color: "#1e40af" }}> ✎</span> : null}
                          </button>
                        ) : figure(row.item, v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
