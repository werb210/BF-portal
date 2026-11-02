// BF_PORTAL_v864_ACTIVE_CONTRACTS - Documents: contract files (lender statements are read automatically and wait
// for one-click confirmation), the funded application's documents, equipment and insurance certificates.
import { useState } from "react";
import { Link } from "react-router-dom";
import { acApi, errorText, type Detail, type Review } from "./api";
import { Btn, card, day, ErrorLine, Field, h3, input, label, money, muted, Pill, table, td, th } from "./ui";
import AssetsInsurance from "./AssetsInsurance";

const KINDS = ["lender_statement", "insurance_certificate", "commission_statement", "contract", "payout_letter", "other"];

export function ReviewRow({ r, onDone, contractId }: { r: Review; onDone: () => void; contractId?: string | null }) {
  const [balance, setBalance] = useState(r.extracted?.balance != null ? String(r.extracted.balance) : "");
  const [asOf, setAsOf] = useState(r.extracted?.as_of ?? "");
  const [cid, setCid] = useState(contractId ?? r.contract_id ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onDone(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <div style={{ border: "1px solid var(--ui-border)", borderRadius: 6, padding: 8, marginBottom: 8 }} data-testid="ac-review">
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13, color: "var(--ui-text)" }}>
        <Pill kind="pending">{r.status === "failed" ? "Could not read - enter figures" : "Pending review"}</Pill>
        <strong>{r.filename ?? "Statement"}</strong>
        {r.company_name ? <span style={muted}>{r.company_name} - {r.lender_name ?? ""}</span> : null}
        {r.extracted?.borrower_name ? <span style={muted}>Borrower on statement: {r.extracted.borrower_name}</span> : null}
      </div>
      {r.error ? <div style={muted}>{r.error}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginTop: 6 }}>
        <Field label="Balance"><input style={input} type="number" value={balance} onChange={(e) => setBalance(e.target.value)} /></Field>
        <Field label="As of"><input style={input} type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
        {r.extracted?.payments_made != null ? <span style={muted}>Payments made: {r.extracted.payments_made}</span> : null}
        {r.extracted?.arrears ? <span style={muted}>Arrears: {money(r.extracted.arrears, true)}</span> : null}
        {!contractId ? <Field label="Contract id"><input style={{ ...input, minWidth: 260 }} value={cid} placeholder="Match to a contract" onChange={(e) => setCid(e.target.value)} /></Field> : null}
        <Btn primary disabled={busy || !balance || !cid} onClick={() => void act(() => acApi.confirmReview(r.id, { balance, as_of: asOf || undefined, contract_id: cid }))}>Confirm balance</Btn>
        <Btn disabled={busy} onClick={() => void act(() => acApi.rejectReview(r.id))}>Reject</Btn>
      </div>
      <ErrorLine text={err} />
    </div>
  );
}

export default function DocumentsPanel({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const c = d.contract;
  const [kind, setKind] = useState("lender_statement");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uploadIt = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try { await acApi.upload(c.id, file, kind); setFile(null); onChanged(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorLine text={err} />
      {d.reviews.length ? (
        <div style={card}>
          <h3 style={h3}>Statements waiting for review</h3>
          {d.reviews.map((r) => <ReviewRow key={r.id} r={r} contractId={c.id} onDone={onChanged} />)}
        </div>
      ) : null}
      <div style={card}>
        <h3 style={h3}>Contract documents</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
          <Field label="Kind"><select style={input} value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select></Field>
          <Field label="File"><input type="file" aria-label="Choose file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, color: "var(--ui-text)" }} /></Field>
          <Btn primary disabled={busy || !file} onClick={() => void uploadIt()}>{busy ? "Uploading..." : "Upload"}</Btn>
        </div>
        <div style={muted}>A lender statement is read automatically (balance, as-of date, payments, arrears) and waits for your confirmation.</div>
        <table style={{ ...table, marginTop: 8 }}>
          <thead><tr><th style={th}>File</th><th style={th}>Kind</th><th style={th}>From</th><th style={th}>Added</th></tr></thead>
          <tbody>
            {d.documents.contract_documents.length === 0 ? <tr><td style={td} colSpan={4}>No contract documents yet.</td></tr> : d.documents.contract_documents.map((doc) => (
              <tr key={doc.id}>
                <td style={td}><button type="button" onClick={() => void acApi.openFile(c.id, doc.id).catch((x) => setErr(errorText(x)))} style={{ background: "none", border: "none", padding: 0, color: "var(--ui-accent-fg)", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>{doc.filename}</button></td>
                <td style={td}>{label(doc.kind)}</td><td style={td}>{label(doc.source)}</td><td style={td}>{day(doc.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={card}>
        <h3 style={h3}>Funded application documents</h3>
        {c.application_id ? <div style={{ marginBottom: 6 }}><Link to={`/applications/${c.application_id}`} style={{ color: "var(--ui-accent-fg)", fontSize: 13 }}>Open the original application</Link></div> : <div style={muted}>Entered by staff - no application linked.</div>}
        {d.documents.application_documents.slice(0, 30).map((doc) => (
          <div key={doc.id} style={{ fontSize: 13, padding: "3px 0", color: "var(--ui-text)" }}>{doc.filename} <span style={muted}>{label(doc.category)} - {day(doc.created_at)}</span></div>
        ))}
      </div>
      <AssetsInsurance d={d} onChanged={onChanged} />
    </div>
  );
}
