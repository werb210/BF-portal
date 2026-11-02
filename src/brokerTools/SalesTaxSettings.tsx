// BF_PORTAL_v865_BROKER_TOOLS_3_SALES_TAX - Settings > Deal tools > Sales tax: the GST / HST / PST / QST rate of every province
// and territory, each with an "as of" date. A rate change is a new dated row, so older quotes keep the rate of their day.
// Admins add or remove rows; staff can look and use the calculator.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { ErrorLine, card, dangerButton, errorText, h3, input, label, money, muted, primaryButton, row, table, td, th } from "./ui";
import { rateSummary, taxPreview, type TaxRate } from "./salesTaxView";

type Current = TaxRate & { name: string; combined: number };
type Province = { code: string; name: string };

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { province: "", effective_from: today(), gst: "", pst: "", hst: "", qst: "", note: "" };

export default function SalesTaxSettings({ isAdmin }: { isAdmin: boolean }) {
  const [current, setCurrent] = useState<Current[]>([]);
  const [rows, setRows] = useState<TaxRate[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [calc, setCalc] = useState({ province: "AB", amount: "1000" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ rates: TaxRate[]; current: Current[]; provinces: Province[] }>("/api/broker-tools/sales-tax/rates");
      setCurrent(r?.current ?? []); setRows(r?.rates ?? []); setProvinces(r?.provinces ?? []);
    } catch (e) { setErr(errorText(e, "Could not load the sales tax rates.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await api.put("/api/broker-tools/sales-tax/rates", form);
      setForm({ ...EMPTY });
      await load();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const remove = async (r: TaxRate) => {
    if (!window.confirm(`Remove the ${r.province} rate as of ${r.effective_from}?`)) return;
    try { await api.delete(`/api/broker-tools/sales-tax/rates/${r.province}/${r.effective_from}`); await load(); } catch (e) { setErr(errorText(e)); }
  };

  const calcRate = current.find((c) => c.province === calc.province);
  const preview = calcRate ? taxPreview(Number(calc.amount), calcRate) : null;
  const num = (k: "gst" | "pst" | "hst" | "qst", text: string) => (
    <label style={{ ...label, flex: "0 1 90px" }}>{text}<input style={input} aria-label={text} inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );

  return (
    <section style={card} data-testid="sales-tax-settings">
      <h3 style={h3}>Sales tax</h3>
      <p style={muted}>The rate in force today in each province and territory. Quotes add it to the fees ticked "Sales tax applies".</p>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={table}>
          <thead><tr><th style={th}>Province</th><th style={th}>Tax</th><th style={th}>Total</th><th style={th}>As of</th></tr></thead>
          <tbody>
            {current.map((c) => (
              <tr key={c.province} data-testid={`sales-tax-${c.province}`}>
                <td style={td}>{c.name}</td><td style={td}>{rateSummary(c)}</td><td style={td}>{c.combined}%</td><td style={td}>{c.effective_from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...row, marginTop: 16 }}>
        <label style={label}>Calculator
          <select style={input} aria-label="Calculator province" value={calc.province} onChange={(e) => setCalc({ ...calc, province: e.target.value })}>
            {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <label style={label}>Amount<input style={input} aria-label="Calculator amount" inputMode="decimal" value={calc.amount} onChange={(e) => setCalc({ ...calc, amount: e.target.value })} /></label>
        {preview && <p style={{ ...muted, color: "var(--ui-text)" }} data-testid="sales-tax-preview">
          {preview.lines.map((l) => `${l.label} ${money(l.amount)}`).join(" + ") || "No tax"} = {money(preview.total)} tax, {money(preview.withTax)} in all
        </p>}
      </div>

      {isAdmin && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ ...h3, fontSize: 14 }}>Add or change a rate</h3>
          <p style={muted}>Enter HST alone, or GST with PST (RST in Manitoba) or QST. Use the date the new rate starts; the old rate stays for earlier days.</p>
          <div style={{ ...row, marginTop: 8 }}>
            <label style={label}>Province
              <select style={input} aria-label="Rate province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">Pick one</option>
                {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </label>
            <label style={label}>As of<input type="date" style={input} aria-label="Rate as of" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></label>
            {num("gst", "GST %")}{num("pst", "PST %")}{num("hst", "HST %")}{num("qst", "QST %")}
            <label style={{ ...label, flex: "1 1 160px" }}>Note<input style={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            <button type="button" style={primaryButton} disabled={busy || !form.province} onClick={() => void save()}>Save rate</button>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--ui-text)" }}>Every dated rate ({rows.length})</summary>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead><tr><th style={th}>Province</th><th style={th}>As of</th><th style={th}>Tax</th><th style={th}>Note</th><th style={th}></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.province}-${r.effective_from}`}>
                      <td style={td}>{r.province}</td><td style={td}>{r.effective_from}</td><td style={td}>{rateSummary(r)}</td><td style={td}>{r.note ?? ""}</td>
                      <td style={td}><button type="button" style={dangerButton} onClick={() => void remove(r)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
      <ErrorLine text={err} />
    </section>
  );
}
