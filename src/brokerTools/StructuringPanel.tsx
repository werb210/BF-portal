// BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS - Deal desk > Structuring: payment options from every lender rate card that takes the
// deal, side by side per term, with Canadian sales tax applied the way the deal is taxed. Staff save the structure
// (and the option chosen) on the file.
import { useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, input, label, money, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { useRun } from "./useRun";
import { PROVINCES, TAX_MODE_LABEL, optionGrid, rateText, type PaymentOption } from "./structuring";

type Form = { amount: string; province: string; terms: string; tier: string; residual_pct: string; down_payment: string; tax_mode: string; advance: boolean };

export function OptionsGrid({ options, chosen, onChoose }: { options: PaymentOption[]; chosen?: number | null; onChoose?: (i: number) => void }) {
  const g = optionGrid(options);
  if (!options.length) return <p style={muted}>No rate card takes this deal. Check the amount, the terms, or the rate cards in Settings &gt; Deal tools.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={table} data-testid="options-grid">
        <thead><tr><th style={th}>Lender</th>{g.terms.map((t) => <th key={t} style={th}>{t} months</th>)}</tr></thead>
        <tbody>
          {g.rows.map((r) => (
            <tr key={r.key}>
              <td style={td}><strong>{r.label}</strong></td>
              {g.terms.map((t) => {
                const c = r.cells[t];
                if (!c) return <td key={t} style={td}><span style={{ color: "var(--ui-text-muted)" }}>-</span></td>;
                const o = c.option;
                return (
                  <td key={t} style={{ ...td, background: chosen === c.index ? "var(--ui-surface-input)" : undefined }}>
                    <div style={{ fontWeight: 700 }}>{money(o.payment_with_tax)}/mo</div>
                    <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{rateText(o)}{o.payment_tax.length ? ` - ${money(o.payment)} + ${o.payment_tax.map((x) => x.label).join(" + ")}` : ""}</div>
                    {o.residual > 0 && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Residual {money(o.residual)}</div>}
                    {o.upfront_total > 0 && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Up front {money(o.upfront_total)}</div>}
                    {onChoose && <button type="button" style={{ ...secondaryButton, marginTop: 4, padding: "4px 8px" }} onClick={() => onChoose(c.index)}>{chosen === c.index ? "Chosen" : "Choose"}</button>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StructureInputs({ form, setForm, busy }: { form: Form; setForm: (f: Form) => void; busy: boolean }) {
  return (
    <div style={row}>
      <label style={label}>Equipment cost<input inputMode="decimal" style={{ ...input, width: 130 }} value={form.amount} disabled={busy} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
      <label style={label}>Province
        <select style={input} value={form.province} disabled={busy} onChange={(e) => setForm({ ...form, province: e.target.value })}>
          <option value="">No tax</option>{PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label style={label}>Terms (months)<input style={{ ...input, width: 130 }} value={form.terms} disabled={busy} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></label>
      <label style={label}>Credit tier
        <select style={input} value={form.tier} disabled={busy} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
          <option value="">Any</option>{["A", "B", "C", "D", "E"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={label}>Residual %<input inputMode="decimal" style={{ ...input, width: 80 }} value={form.residual_pct} disabled={busy} onChange={(e) => setForm({ ...form, residual_pct: e.target.value })} /></label>
      <label style={label}>Down payment<input inputMode="decimal" style={{ ...input, width: 110 }} value={form.down_payment} disabled={busy} onChange={(e) => setForm({ ...form, down_payment: e.target.value })} /></label>
      <label style={label}>Sales tax
        <select style={input} value={form.tax_mode} disabled={busy} onChange={(e) => setForm({ ...form, tax_mode: e.target.value })}>
          {Object.entries(TAX_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" checked={form.advance} disabled={busy} onChange={(e) => setForm({ ...form, advance: e.target.checked })} />Payments in advance</label>
    </div>
  );
}

export const emptyForm: Form = { amount: "", province: "", terms: "24, 36, 48, 60", tier: "", residual_pct: "0", down_payment: "0", tax_mode: "lease", advance: false };
export const formBody = (f: Form) => ({ ...f, tier: f.tier || null, province: f.province || null, terms: f.terms });

export default function StructuringPanel({ applicationId }: { applicationId: string }) {
  const base = `/api/deal-desk/applications/${encodeURIComponent(applicationId)}/structure`;
  const [form, setForm] = useState<Form>(emptyForm);
  const [options, setOptions] = useState<PaymentOption[] | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [saved, setSaved] = useState<{ chosen: PaymentOption | null; created_at: string } | null>(null);
  const { busy, err, msg, run } = useRun();
  useEffect(() => {
    void api.get<any>(base).then((r) => {
      const d = r?.defaults ?? {};
      setForm((f) => ({ ...f, amount: d.amount ? String(d.amount) : f.amount, province: d.province ?? f.province, tier: d.tier ?? f.tier }));
      setSaved(r?.saved ?? null);
    }).catch(() => undefined);
  }, [base]);
  const compute = () => run(async () => { const r = await api.post<any>(base, formBody(form)); setOptions(r?.options ?? []); setChosen(null); });
  const save = () => run(async () => {
    const r = await api.post<any>(base, { ...formBody(form), save: true, chosen });
    setOptions(r?.options ?? []);
    setSaved({ chosen: chosen !== null ? (r?.options ?? [])[chosen] ?? null : null, created_at: new Date().toISOString() });
  }, "Structure saved on the file.");

  return (
    <section style={card} data-testid="structuring-panel">
      <h3 style={h3}>Structuring</h3>
      <p style={muted}>Payment options from every lender rate card that takes this deal, side by side, with sales tax.</p>
      {saved?.chosen && <p style={{ ...muted, color: "var(--ui-text)" }}><Chip tone="green">Saved</Chip> {saved.chosen.lender_name} {saved.chosen.term_months} months at {rateText(saved.chosen)}: {money(saved.chosen.payment_with_tax)}/mo</p>}
      <StructureInputs form={form} setForm={setForm} busy={busy} />
      <div style={{ ...row, marginTop: 8 }}>
        <button type="button" style={primaryButton} disabled={busy} onClick={() => void compute()}>Compare lenders</button>
        {options && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void save()}>{chosen === null ? "Save these options" : "Save with the chosen option"}</button>}
      </div>
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {options && <div style={{ marginTop: 12 }}><OptionsGrid options={options} chosen={chosen} onChoose={setChosen} /></div>}
    </section>
  );
}
