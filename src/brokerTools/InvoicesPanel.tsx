// BF_PORTAL_v867_BROKER_TOOLS_INVOICES - Deal desk > Vendor invoices: the AI reads the vendor's invoice into a draft (vendor,
// invoice number, date, line items, subtotal, taxes, total, equipment with serial / VIN); staff correct it and confirm.
// Confirming fills the deal's equipment fields and the Active Contract's equipment assets.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, dangerButton, h3, input, label, money, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { postFile, useRun } from "./useRun";

export type Equipment = { description: string; year: number | null; make: string | null; model: string | null; serial_number: string | null; vin: string | null; condition: "new" | "used" | null; cost: number | null };
export type InvoiceData = {
  vendor_name: string | null; vendor_tax_number: string | null; invoice_number: string | null; invoice_date: string | null; currency: string;
  line_items: { description: string; amount: number | null }[]; subtotal: number | null; taxes: { label: string; amount: number }[]; total: number | null;
  equipment: Equipment[];
};
export type Invoice = { id: string; status: "draft" | "confirmed"; file_name: string | null; data: InvoiceData; warnings: string[]; read_error: string | null; assets_contract_id: string | null; confirmed_at: string | null };
type Doc = { id: string; filename: string | null; category: string | null; likely_invoice: boolean };

const blankEquipment: Equipment = { description: "", year: null, make: null, model: null, serial_number: null, vin: null, condition: null, cost: null };
const numOrNull = (v: string): number | null => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/** The confirmed equipment as one line each, for the summary. */
export function equipmentLine(e: Equipment): string {
  const name = e.description || [e.year, e.make, e.model].filter(Boolean).join(" ");
  const id = e.vin ? `VIN ${e.vin}` : e.serial_number ? `S/N ${e.serial_number}` : "no serial";
  return `${name} (${id})${e.cost !== null ? ` ${money(e.cost)}` : ""}`;
}

function DraftEditor({ inv, base, busy, run }: { inv: Invoice; base: string; busy: boolean; run: ReturnType<typeof useRun>["run"] }) {
  const [d, setD] = useState<InvoiceData>(inv.data);
  useEffect(() => setD(inv.data), [inv]);
  const set = (k: keyof InvoiceData, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const setEq = (i: number, k: keyof Equipment, v: unknown) => setD((x) => ({ ...x, equipment: x.equipment.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }));
  const save = () => run(() => api.patch(`${base}/${inv.id}`, d), "Saved.");
  const confirm = () => run(async () => { await api.patch(`${base}/${inv.id}`, d); await api.post(`${base}/${inv.id}/confirm`); }, "Confirmed. The deal's equipment is filled in.");
  return (
    <div data-testid={`invoice-draft-${inv.id}`}>
      {inv.read_error && <p role="alert" style={{ ...muted, color: "var(--ui-text-danger)" }}>The AI could not read this file ({inv.read_error}). Type the invoice in below.</p>}
      {inv.warnings.length > 0 && (
        <ul data-testid="invoice-warnings" style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13, color: "var(--ui-text)" }}>
          {inv.warnings.map((w) => <li key={w}><Chip tone="amber">Check</Chip> {w}</li>)}
        </ul>
      )}
      <div style={row}>
        <label style={label}>Vendor<input style={input} value={d.vendor_name ?? ""} onChange={(e) => set("vendor_name", e.target.value)} /></label>
        <label style={label}>Invoice number<input style={input} value={d.invoice_number ?? ""} onChange={(e) => set("invoice_number", e.target.value)} /></label>
        <label style={label}>Invoice date<input type="date" style={input} value={d.invoice_date ?? ""} onChange={(e) => set("invoice_date", e.target.value || null)} /></label>
        <label style={label}>Subtotal<input inputMode="decimal" style={{ ...input, width: 120 }} value={d.subtotal ?? ""} onChange={(e) => set("subtotal", numOrNull(e.target.value))} /></label>
        <label style={label}>Total<input inputMode="decimal" style={{ ...input, width: 120 }} value={d.total ?? ""} onChange={(e) => set("total", numOrNull(e.target.value))} /></label>
      </div>
      <p style={muted}>Taxes: {d.taxes.length ? d.taxes.map((t) => `${t.label} ${money(t.amount)}`).join(", ") : "none on the invoice"}{d.line_items.length ? ` - ${d.line_items.length} line item${d.line_items.length === 1 ? "" : "s"}` : ""}</p>
      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table style={table}>
          <thead><tr>{["Equipment", "Year", "Make", "Model", "Serial number", "VIN", "Cost", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {d.equipment.map((e, i) => (
              <tr key={i}>
                <td style={td}><input aria-label={`Equipment ${i + 1}`} style={{ ...input, minWidth: 180 }} value={e.description} onChange={(ev) => setEq(i, "description", ev.target.value)} /></td>
                <td style={td}><input aria-label={`Year ${i + 1}`} style={{ ...input, width: 70 }} value={e.year ?? ""} onChange={(ev) => setEq(i, "year", numOrNull(ev.target.value))} /></td>
                <td style={td}><input aria-label={`Make ${i + 1}`} style={{ ...input, width: 110 }} value={e.make ?? ""} onChange={(ev) => setEq(i, "make", ev.target.value || null)} /></td>
                <td style={td}><input aria-label={`Model ${i + 1}`} style={{ ...input, width: 110 }} value={e.model ?? ""} onChange={(ev) => setEq(i, "model", ev.target.value || null)} /></td>
                <td style={td}><input aria-label={`Serial ${i + 1}`} style={{ ...input, width: 140 }} value={e.serial_number ?? ""} onChange={(ev) => setEq(i, "serial_number", ev.target.value || null)} /></td>
                <td style={td}><input aria-label={`VIN ${i + 1}`} style={{ ...input, width: 170 }} value={e.vin ?? ""} onChange={(ev) => setEq(i, "vin", ev.target.value || null)} /></td>
                <td style={td}><input aria-label={`Cost ${i + 1}`} inputMode="decimal" style={{ ...input, width: 110 }} value={e.cost ?? ""} onChange={(ev) => setEq(i, "cost", numOrNull(ev.target.value))} /></td>
                <td style={td}><button type="button" style={dangerButton} onClick={() => set("equipment", d.equipment.filter((_, j) => j !== i))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        <button type="button" style={secondaryButton} disabled={busy} onClick={() => set("equipment", [...d.equipment, { ...blankEquipment }])}>Add equipment</button>
        <button type="button" style={secondaryButton} disabled={busy} onClick={() => void save()}>Save</button>
        <button type="button" style={primaryButton} disabled={busy || !d.equipment.length} onClick={() => void confirm()}>Confirm and fill the deal</button>
        <button type="button" style={dangerButton} disabled={busy} onClick={() => { if (window.confirm("Discard this reading?")) void run(() => api.delete(`${base}/${inv.id}`)); }}>Discard</button>
      </div>
    </div>
  );
}

export default function InvoicesPanel({ applicationId }: { applicationId: string }) {
  const base = `/api/deal-desk/applications/${encodeURIComponent(applicationId)}/invoices`;
  const [list, setList] = useState<Invoice[] | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState("");
  const load = useCallback(async () => {
    const r = await api.get<{ invoices: Invoice[] }>(base).catch(() => null);
    setList(Array.isArray(r?.invoices) ? r!.invoices : []);
  }, [base]);
  const { busy, err, msg, run } = useRun(load);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void api.get<{ documents: Doc[] }>(`/api/deal-desk/applications/${encodeURIComponent(applicationId)}/invoice-documents`)
      .then((r) => { const d = Array.isArray(r?.documents) ? r.documents : []; setDocs(d); setDocId((v) => v || d.find((x) => x.likely_invoice)?.id || ""); })
      .catch(() => setDocs([]));
  }, [applicationId]);

  const read = () => run(async () => { if (!docId) throw new Error("Pick the invoice."); await api.post(`${base}/read`, { document_id: docId }); }, "Read. Check the draft below and confirm it.");
  const uploadAndRead = (f: File | undefined) => { if (f) void run(() => postFile(`${base}/read`, f), "Read. Check the draft below and confirm it."); };

  return (
    <section style={card} data-testid="invoices-panel">
      <h3 style={h3}>Vendor invoices</h3>
      <p style={muted}>The AI reads the vendor's invoice: vendor, invoice number, date, line items, taxes, total and each piece of equipment with its serial number or VIN. Check it, then confirm to fill the deal.</p>
      <div style={{ ...row, marginTop: 10 }}>
        <label style={label}>Invoice on the file
          <select style={input} value={docId} onChange={(e) => setDocId(e.target.value)}>
            <option value="">Choose a document</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.filename ?? d.id}{d.likely_invoice ? " (invoice)" : ""}</option>)}
          </select>
        </label>
        <button type="button" style={primaryButton} disabled={busy || !docId} onClick={() => void read()}>{busy ? "Reading..." : "Read invoice"}</button>
        <label style={label}>Or upload one
          <input type="file" accept="application/pdf,image/*" aria-label="Upload an invoice" disabled={busy} style={{ ...input, padding: 4 }} onChange={(e) => uploadAndRead(e.target.files?.[0])} />
        </label>
      </div>
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      {list === null ? <p style={muted}>Loading...</p> : list.length === 0 ? <p style={muted}>No invoices read on this file yet.</p> : list.map((inv) => (
        <div key={inv.id} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{inv.data.vendor_name ?? "Vendor not read"}{inv.data.invoice_number ? ` - ${inv.data.invoice_number}` : ""}</strong>
            <Chip tone={inv.status === "confirmed" ? "green" : "amber"}>{inv.status === "confirmed" ? "Confirmed" : "Draft"}</Chip>
            {inv.assets_contract_id && <Chip tone="blue">On the contract</Chip>}
            <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{money(inv.data.total)}{inv.file_name ? ` - ${inv.file_name}` : ""}</span>
          </div>
          {inv.status === "draft" ? <DraftEditor inv={inv} base={base} busy={busy} run={run} /> : (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--ui-text)" }}>
              {inv.data.equipment.map((e, i) => <li key={i}>{equipmentLine(e)}</li>)}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
