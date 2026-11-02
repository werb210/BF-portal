// BF_PORTAL_v864_ACTIVE_CONTRACTS - the Active Contracts tab on a CRM company or contact (right of Timeline): the
// client's portfolio summary, every financing contract, the right rail, and Completed / Closed contracts (history is
// never deleted).
import { useCallback, useEffect, useState } from "react";
import { acApi, errorText, type Contract, type Summary } from "./api";
import { KpiTiles, RightRail } from "./Summary";
import ContractsTable from "./ContractsTable";
import { Btn, card, ErrorLine, Field, h3, input } from "./ui";

/** Right rail beside the table on wide screens, under it on narrow ones. */
export const AC_GRID_CSS = ".ac-main-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}@media (min-width:1280px){.ac-main-grid{grid-template-columns:minmax(0,1fr) 300px}}";

export default function ActiveContractsTab({ companyId, contactId }: { companyId?: string; contactId?: string }) {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await acApi.list(companyId ? { company_id: companyId } : { contact_id: contactId ?? "" });
      setContracts(r.contracts ?? []);
      setSummary(r.summary ?? null);
      setErr(null);
    } catch (e) { setErr(errorText(e)); }
  }, [companyId, contactId]);
  useEffect(() => { void load(); }, [load]);
  if (err) return <ErrorLine text={err} />;
  if (!contracts || !summary) return <div style={{ padding: 12, color: "var(--ui-text-muted)" }}>Loading contracts...</div>;
  const open = contracts.filter((c) => !c.is_history);
  const history = contracts.filter((c) => c.is_history);
  const companyForAdd = companyId ?? contracts.find((c) => c.company_id)?.company_id ?? null;
  return (
    <div data-testid="active-contracts-tab" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <KpiTiles s={summary} />
      <style>{AC_GRID_CSS}</style>
      <div className="ac-main-grid">
        <div style={{ display: "grid", gap: 12, minWidth: 0, alignContent: "start" }}>
          {adding ? <AddContract companyId={companyForAdd} contactId={contactId ?? null} onDone={(id) => { setAdding(false); if (id) { setOpenId(id); void load(); } }} /> : null}
          <ContractsTable title="Active Contracts" contracts={open} onChanged={() => void load()} onAdd={companyForAdd ? () => setAdding(true) : undefined} openId={openId} setOpenId={setOpenId} />
          <section style={card}>
            <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 16, fontWeight: 700, color: "var(--ui-text)" }}>
              {showHistory ? "v" : ">"} Completed / Closed Contracts ({history.length})
            </button>
            {showHistory ? <div style={{ marginTop: 8 }}><ContractsTable title="History" contracts={history} onChanged={() => void load()} openId={openId} setOpenId={setOpenId} /></div> : null}
          </section>
        </div>
        <RightRail s={summary} onOpen={(id) => setOpenId(id)} />
      </div>
    </div>
  );
}

function AddContract({ companyId, contactId, onDone }: { companyId: string | null; contactId: string | null; onDone: (id: string | null) => void }) {
  const [f, setF] = useState<Record<string, string>>({ product_category: "TERM" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
      const r = await acApi.create({ ...body, company_id: companyId, contact_id: contactId });
      onDone(r.id);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const fld = (k: string, l: string, type = "text") => <Field label={l}><input style={input} type={type} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>;
  return (
    <div style={card} data-testid="ac-add">
      <h3 style={h3}>Add a contract</h3>
      <div style={{ color: "var(--ui-text-muted)", fontSize: 12, marginBottom: 6 }}>Funded applications become contracts automatically. Use this for facilities arranged outside the system, or link a funded application by its id.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
        {fld("application_id", "Funded application id (optional)")}{fld("lender_name", "Lender")}{fld("product_name", "Product")}
        <Field label="Product type"><select style={input} value={f.product_category} onChange={(e) => setF({ ...f, product_category: e.target.value })}>{["TERM", "EQUIPMENT", "LOC", "MCA", "FACTORING", "ABL", "SBA", "PO", "MEDIA"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        {fld("facility_type", "Facility type")}{fld("original_amount", "Original amount", "number")}{fld("funded_at", "Funding date", "date")}{fld("term_months", "Term (months)", "number")}
        {fld("interest_rate", "Rate % / yr", "number")}{fld("factor_rate", "Factor rate (MCA)", "number")}{fld("payment_amount", "Payment amount", "number")}
        <Field label="Payment frequency"><select style={input} value={f.payment_frequency ?? ""} onChange={(e) => setF({ ...f, payment_frequency: e.target.value })}><option value="">-</option>{["daily", "weekly", "biweekly", "semi_monthly", "monthly", "quarterly", "annually"].map((x) => <option key={x} value={x}>{x.replace("_", "-")}</option>)}</select></Field>
      </div>
      <ErrorLine text={err} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Btn primary disabled={busy} onClick={() => void save()}>Save contract</Btn><Btn onClick={() => onDone(null)}>Cancel</Btn></div>
    </div>
  );
}
