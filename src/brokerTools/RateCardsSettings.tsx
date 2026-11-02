// BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS - Settings > Deal tools > Rate cards: each lender product's grid (term x amount band x
// credit tier -> rate or factor), fees and residual options. Admins add cards and load grids by CSV; staff can look.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, dangerButton, h3, input, label, money, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { postFile, useRun } from "./useRun";

type Cell = { term_months: number; amount_min: number; amount_max: number | null; tier: string; rate: number };
type Fee = { label: string; amount: number; taxable: boolean; financed: boolean };
export type RateCard = { id: string; name: string; lender_id: string | null; lender_product_id: string | null; lender_name: string | null; product_name: string | null;
  rate_kind: "apr" | "factor"; active: boolean; min_amount: number | null; max_amount: number | null; fees: Fee[]; residual_options: { label: string; pct: number }[]; cells: Cell[] };

export const CSV_EXAMPLE = "term,min,max,tier,rate\n36,0,49999.99,,9.5\n36,50000,,A,7.9\n36,50000,,,8.9\n48,0,,,9.4";

/** Rows = amount band and tier, columns = terms. */
export function grid(cells: Cell[]): { terms: number[]; rows: { label: string; rates: Record<number, number> }[] } {
  const terms = [...new Set(cells.map((c) => c.term_months))].sort((a, b) => a - b);
  const byRow = new Map<string, { label: string; rates: Record<number, number>; sort: number }>();
  for (const c of cells) {
    const band = `${money(c.amount_min, 0)} - ${c.amount_max === null ? "and up" : money(c.amount_max, 0)}`;
    const key = `${c.amount_min}|${c.amount_max}|${c.tier}`;
    if (!byRow.has(key)) byRow.set(key, { label: `${band}${c.tier === "any" ? "" : ` (tier ${c.tier})`}`, rates: {}, sort: c.amount_min * 10 + (c.tier === "any" ? 0 : c.tier.charCodeAt(0)) });
    byRow.get(key)!.rates[c.term_months] = c.rate;
  }
  return { terms, rows: [...byRow.values()].sort((a, b) => a.sort - b.sort).map(({ label, rates }) => ({ label, rates })) };
}

const blank = { id: "", name: "", lender_id: "", lender_product_id: "", rate_kind: "apr", min_amount: "", max_amount: "", fee_label: "Documentation fee", fee_amount: "", fee_taxable: true, fee_financed: false, residuals: "" };

export default function RateCardsSettings({ isAdmin }: { isAdmin: boolean }) {
  const [cards, setCards] = useState<RateCard[] | null>(null);
  const [lenders, setLenders] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; lender_id: string }[]>([]);
  const [form, setForm] = useState(blank);
  const [csv, setCsv] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const r = await api.get<{ cards: RateCard[] }>("/api/deal-desk/rate-cards").catch(() => null);
    setCards(Array.isArray(r?.cards) ? r!.cards : []);
  }, []);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void api.get<any>("/api/broker-tools/lender-options").then((r) => { setLenders(r?.lenders ?? []); setProducts(r?.products ?? []); }).catch(() => undefined); }, []);

  const save = () => run(async () => {
    const body = {
      name: form.name, lender_id: form.lender_id || null, lender_product_id: form.lender_product_id || null, rate_kind: form.rate_kind,
      min_amount: form.min_amount, max_amount: form.max_amount,
      fees: form.fee_amount ? [{ label: form.fee_label, amount: form.fee_amount, taxable: form.fee_taxable, financed: form.fee_financed }] : [],
      residual_options: form.residuals.split(",").map((x) => x.trim()).filter(Boolean).map((x) => ({ label: `${x}%`, pct: x })),
    };
    if (form.id) await api.put(`/api/deal-desk/rate-cards/${form.id}`, body); else await api.post("/api/deal-desk/rate-cards", body);
    setForm(blank);
  }, "Rate card saved.");
  const edit = (c: RateCard) => setForm({ ...blank, id: c.id, name: c.name, lender_id: c.lender_id ?? "", lender_product_id: c.lender_product_id ?? "", rate_kind: c.rate_kind,
    min_amount: c.min_amount === null ? "" : String(c.min_amount), max_amount: c.max_amount === null ? "" : String(c.max_amount),
    fee_label: c.fees[0]?.label ?? "Documentation fee", fee_amount: c.fees[0] ? String(c.fees[0].amount) : "", fee_taxable: c.fees[0]?.taxable ?? true, fee_financed: c.fees[0]?.financed ?? false,
    residuals: c.residual_options.map((r) => r.pct).join(", ") });
  const importCsv = (c: RateCard) => run(async () => { const r = await api.post<any>(`/api/deal-desk/rate-cards/${c.id}/import`, { csv: csv[c.id] ?? "" }); setCsv((x) => ({ ...x, [c.id]: "" })); return r; }, "Grid loaded.");
  const importFile = (c: RateCard, f: File | undefined) => { if (f) void run(() => postFile(`/api/deal-desk/rate-cards/${c.id}/import`, f), "Grid loaded."); };

  return (
    <section style={card} data-testid="rate-cards-settings">
      <h3 style={h3}>Rate cards</h3>
      <p style={muted}>Each lender product's rates by term, amount and credit tier. The Deal desk and vendor quotes compare every active card that takes a deal.</p>
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {cards === null ? <p style={muted}>Loading...</p> : cards.length === 0 ? <p style={muted}>No rate cards yet.</p> : cards.map((c) => {
        const g = grid(c.cells);
        return (
          <div key={c.id} data-testid={`rate-card-${c.id}`} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14 }}>{c.lender_name ?? "Lender"} - {c.product_name ?? c.name}</strong>
              <Chip tone={c.active ? "green" : "grey"}>{c.active ? "Active" : "Off"}</Chip>
              <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{c.rate_kind === "factor" ? "Factor rates" : "APR"}{c.fees.length ? ` - fees: ${c.fees.map((f) => `${f.label} ${money(f.amount)}`).join(", ")}` : ""}</span>
            </div>
            {g.rows.length > 0 ? (
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={table}>
                  <thead><tr><th style={th}>Amount</th>{g.terms.map((t) => <th key={t} style={th}>{t} mo</th>)}</tr></thead>
                  <tbody>{g.rows.map((r) => <tr key={r.label}><td style={td}>{r.label}</td>{g.terms.map((t) => <td key={t} style={td}>{r.rates[t] ?? "-"}</td>)}</tr>)}</tbody>
                </table>
              </div>
            ) : <p style={muted}>No rates loaded yet.</p>}
            {isAdmin && (
              <div style={{ ...row, marginTop: 8 }}>
                <label style={{ ...label, flex: "1 1 280px" }}>Paste CSV (term,min,max,tier,rate)
                  <textarea aria-label={`CSV for ${c.name}`} style={{ ...input, minHeight: 60, fontFamily: "monospace" }} placeholder={CSV_EXAMPLE} value={csv[c.id] ?? ""} onChange={(e) => setCsv((x) => ({ ...x, [c.id]: e.target.value }))} />
                </label>
                <button type="button" style={primaryButton} disabled={busy || !(csv[c.id] ?? "").trim()} onClick={() => void importCsv(c)}>Load grid</button>
                <label style={label}>Or a CSV file<input type="file" accept=".csv,text/csv" disabled={busy} style={{ ...input, padding: 4 }} onChange={(e) => importFile(c, e.target.files?.[0])} /></label>
                <button type="button" style={secondaryButton} onClick={() => edit(c)}>Edit</button>
                <button type="button" style={dangerButton} disabled={busy} onClick={() => { if (window.confirm(`Delete ${c.name}?`)) void run(() => api.delete(`/api/deal-desk/rate-cards/${c.id}`)); }}>Delete</button>
              </div>
            )}
          </div>
        );
      })}
      {isAdmin && (
        <>
          <h3 style={{ ...h3, marginTop: 16 }}>{form.id ? "Edit rate card" : "Add a rate card"}</h3>
          <div style={row}>
            <label style={label}>Name<input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label style={label}>Lender
              <select style={input} value={form.lender_id} onChange={(e) => setForm({ ...form, lender_id: e.target.value, lender_product_id: "" })}>
                <option value="">Choose</option>{lenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label style={label}>Product
              <select style={input} value={form.lender_product_id} onChange={(e) => setForm({ ...form, lender_product_id: e.target.value })}>
                <option value="">Any product</option>{products.filter((p) => p.lender_id === form.lender_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={label}>Rate type
              <select style={input} value={form.rate_kind} onChange={(e) => setForm({ ...form, rate_kind: e.target.value })}><option value="apr">APR %</option><option value="factor">Factor</option></select>
            </label>
            <label style={label}>Min amount<input inputMode="decimal" style={{ ...input, width: 110 }} value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} /></label>
            <label style={label}>Max amount<input inputMode="decimal" style={{ ...input, width: 110 }} value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} /></label>
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <label style={label}>Fee<input style={input} value={form.fee_label} onChange={(e) => setForm({ ...form, fee_label: e.target.value })} /></label>
            <label style={label}>Fee amount<input inputMode="decimal" style={{ ...input, width: 100 }} value={form.fee_amount} onChange={(e) => setForm({ ...form, fee_amount: e.target.value })} /></label>
            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={form.fee_taxable} onChange={(e) => setForm({ ...form, fee_taxable: e.target.checked })} />Taxable</label>
            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={form.fee_financed} onChange={(e) => setForm({ ...form, fee_financed: e.target.checked })} />Financed</label>
            <label style={label}>Residual options %<input style={{ ...input, width: 120 }} placeholder="0, 10, 20" value={form.residuals} onChange={(e) => setForm({ ...form, residuals: e.target.value })} /></label>
            <button type="button" style={primaryButton} disabled={busy} onClick={() => void save()}>{form.id ? "Save changes" : "Add rate card"}</button>
            {form.id && <button type="button" style={secondaryButton} onClick={() => setForm(blank)}>Cancel</button>}
          </div>
        </>
      )}
    </section>
  );
}
