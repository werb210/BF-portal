// BF_PORTAL_v952_INVOICE_TEMPLATES - Close tab: make an invoice for this file on the brokerage's own invoice template
// (uploaded in Settings > Term sheet templates, "Invoice"). Each invoice gets the next number and is listed here.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api, rawApiFetch } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Invoice = { id: string; number: string; description: string; amount: string; tax: string; total: string; due_date: string | null; created_at: string };

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ui-text-muted)" };
const inp: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const btn: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const dollars = (v: unknown): string => { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString("en-CA", { style: "currency", currency: "CAD" }).replace("CA", "") : ""; };

export default function InvoicePanel({ applicationId, suggestedAmount }: { applicationId: string; suggestedAmount?: number | null }) {
  const [list, setList] = useState<Invoice[] | null>(null);
  const [hasTemplate, setHasTemplate] = useState<boolean | null>(null);
  const [f, setF] = useState({ amount: suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : "", description: "Broker fee", tax: "", due: "15" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ has_template?: boolean; invoices?: Invoice[] }>(`/api/licensee-documents/applications/${encodeURIComponent(applicationId)}/invoices`);
      setList(Array.isArray(r?.invoices) ? r.invoices : []); setHasTemplate(Boolean(r?.has_template));
    } catch (e) { setList([]); setHasTemplate(null); setMsg({ ok: false, text: getErrorMessage(e, "The invoices could not be loaded.") }); }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  const amount = Number(f.amount.replace(/[$,\s]/g, ""));
  const taxPct = f.tax.trim() === "" ? 0 : Number(f.tax);
  const valid = Number.isFinite(amount) && amount > 0 && f.description.trim() !== "" && Number.isFinite(taxPct) && taxPct >= 0 && taxPct <= 30;
  const total = valid ? Math.round(amount * 100 + Math.round((amount * 100 * taxPct) / 100)) / 100 : null;

  async function make() {
    setBusy(true); setMsg(null);
    try {
      const res = await rawApiFetch(`/api/licensee-documents/applications/${encodeURIComponent(applicationId)}/invoice`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: f.description.trim(), tax_percent: taxPct, due_days: f.due.trim() === "" ? null : Number(f.due) }),
      });
      if (!res.ok) { const j = (await res.json().catch(() => ({}))) as { message?: string }; throw new Error(j.message ?? `The invoice could not be made (${res.status}).`); }
      const number = res.headers.get("X-Invoice-Number") ?? "invoice";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `${number}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setMsg({ ok: true, text: `${number} was made and downloaded.` });
      await load();
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "The invoice could not be made.") }); }
    finally { setBusy(false); }
  }

  return (
    <section style={card} data-testid="invoice-panel">
      <h3 style={{ margin: 0, fontSize: 16 }}>Invoice</h3>
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 10px" }}>Makes an invoice for this file on your own invoice template, with the next invoice number.</p>
      {hasTemplate === false ? (
        <p data-testid="invoice-no-template" style={{ fontSize: 13, color: "#92400e", margin: 0 }}>
          No invoice template has been uploaded yet. <Link to="/settings/your-documents-group" style={{ color: "#1e3a8a", fontWeight: 600 }}>Upload it in Settings</Link> (choose "Invoice"), then come back.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <label style={{ ...lab, gridColumn: "span 2" }}>What it is for<input style={inp} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} data-testid="invoice-description" /></label>
            <label style={lab}>Amount before tax ($)<input style={inp} inputMode="decimal" value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} data-testid="invoice-amount" /></label>
            <label style={lab}>Tax (%)<input style={inp} inputMode="decimal" placeholder="0" value={f.tax} onChange={(e) => setF((x) => ({ ...x, tax: e.target.value }))} data-testid="invoice-tax" /></label>
            <label style={lab}>Due in (days)<input style={inp} inputMode="numeric" value={f.due} onChange={(e) => setF((x) => ({ ...x, due: e.target.value }))} data-testid="invoice-due" /></label>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" style={{ ...btn, opacity: valid && !busy ? 1 : 0.55 }} disabled={!valid || busy} aria-busy={busy} onClick={() => void make()} data-testid="invoice-make">{busy ? "Making…" : "Make the invoice"}</button>
            {total !== null ? <span style={{ fontSize: 13 }}>Total due <strong data-testid="invoice-total">{dollars(total)}</strong></span> : null}
          </div>
        </>
      )}
      {msg ? <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, color: msg.ok ? "#166534" : "#b91c1c", margin: "8px 0 0" }}>{msg.text}</p> : null}
      {list && list.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 13 }} data-testid="invoice-list">
          <caption style={{ textAlign: "left", color: "var(--ui-text-muted)", fontSize: 12, marginBottom: 4 }}>Invoices made for this file</caption>
          <thead><tr>{["Number", "For", "Total", "Due", "Made"].map((h) => <th key={h} style={{ textAlign: "left", padding: 6, borderBottom: "1px solid var(--ui-border)", color: "var(--ui-text-muted)", fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>{list.map((i) => (
            <tr key={i.id}><td style={{ padding: 6 }}>{i.number}</td><td style={{ padding: 6 }}>{i.description}</td><td style={{ padding: 6 }}>{dollars(i.total)}</td><td style={{ padding: 6 }}>{i.due_date ?? "-"}</td><td style={{ padding: 6 }}>{String(i.created_at).slice(0, 10)}</td></tr>
          ))}</tbody>
        </table>
      ) : null}
    </section>
  );
}
