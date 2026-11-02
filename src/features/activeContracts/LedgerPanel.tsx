// BF_PORTAL_v864_ACTIVE_CONTRACTS - Payments & Ledger: the balance history (with sources), the immutable ledger
// (corrections are new entries; nothing is edited or deleted) and recording money received.
import { useState } from "react";
import { acApi, errorText, type Detail } from "./api";
import { balanceSource, Btn, card, day, ErrorLine, Field, h3, input, label, money, muted, table, td, th } from "./ui";

const TYPES: Array<[string, string]> = [
  ["commission_received", "Commission received"], ["recurring_payment", "Recurring payment to Boreal"], ["profit_share_payment", "Profit-share payment"],
  ["adjustment", "Adjustment (+/-)"], ["clawback", "Clawback"], ["payoff", "Payoff"], ["maturity", "Maturity"], ["renewal", "Renewal event"],
  ["refinance", "Refinancing"], ["closure", "Contract closure"],
];

export default function LedgerPanel({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const c = d.contract;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bal, setBal] = useState({ balance: "", as_of: "", note: "" });
  const [e, setE] = useState<Record<string, string>>({ entry_type: "commission_received", amount: "", effective_on: "", period_label: "", expected_payment_id: "", document_id: "", notes: "" });
  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setErr(null);
    try { await fn(); after?.(); onChanged(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  const open = d.revenue.schedule.filter((s) => s.status !== "received" && s.status !== "waived");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorLine text={err} />
      <div style={card}>
        <h3 style={h3}>Balance</h3>
        <div style={{ fontSize: 13, color: "var(--ui-text)", marginBottom: 6 }}>{money(c.balance.balance)} - {balanceSource(c.balance)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <Field label="New balance"><input style={input} type="number" value={bal.balance} onChange={(x) => setBal({ ...bal, balance: x.target.value })} /></Field>
          <Field label="As of"><input style={input} type="date" value={bal.as_of} onChange={(x) => setBal({ ...bal, as_of: x.target.value })} /></Field>
          <Field label="Note"><input style={input} value={bal.note} onChange={(x) => setBal({ ...bal, note: x.target.value })} /></Field>
          <Btn disabled={busy || !bal.balance} onClick={() => void run(() => acApi.addBalance(c.id, bal), () => setBal({ balance: "", as_of: "", note: "" }))}>Update balance</Btn>
        </div>
        <div style={{ ...muted, marginTop: 6 }}>Lender statements uploaded under Documents are read automatically and wait for a one-click confirmation.</div>
        {d.balances.length ? (
          <table style={{ ...table, marginTop: 8 }}>
            <thead><tr><th style={th}>As of</th><th style={th}>Balance</th><th style={th}>Source</th><th style={th}>Payments</th><th style={th}>Arrears</th><th style={th}>Note</th></tr></thead>
            <tbody>{d.balances.map((b) => (
              <tr key={b.id}><td style={td}>{day(b.as_of)}</td><td style={td}>{money(Number(b.balance), true)}</td><td style={td}>{label(b.source)}</td><td style={td}>{b.payments_made ?? "-"}</td><td style={td}>{b.arrears ? money(Number(b.arrears), true) : "-"}</td><td style={td}>{b.note ?? ""}</td></tr>
            ))}</tbody>
          </table>
        ) : null}
      </div>
      <div style={card}>
        <h3 style={h3}>Record an entry</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          <Field label="Type"><select style={input} value={e.entry_type} onChange={(x) => setE({ ...e, entry_type: x.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Amount received"><input style={input} type="number" value={e.amount} onChange={(x) => setE({ ...e, amount: x.target.value })} /></Field>
          <Field label="Payment date"><input style={input} type="date" value={e.effective_on} onChange={(x) => setE({ ...e, effective_on: x.target.value })} /></Field>
          <Field label="Payment period"><input style={input} placeholder="2026-10" value={e.period_label} onChange={(x) => setE({ ...e, period_label: x.target.value })} /></Field>
          <Field label="Against expected payment">
            <select style={input} value={e.expected_payment_id} onChange={(x) => setE({ ...e, expected_payment_id: x.target.value })}>
              <option value="">None</option>
              {open.map((s) => <option key={s.id} value={s.id}>{day(s.due_on)} {label(s.kind)} {money(s.expected_amount, true)}</option>)}
            </select>
          </Field>
          <Field label="Supporting statement">
            <select style={input} value={e.document_id} onChange={(x) => setE({ ...e, document_id: x.target.value })}>
              <option value="">None</option>
              {d.documents.contract_documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
            </select>
          </Field>
          <Field label="Broker split $ (blank = terms)"><input style={input} type="number" value={e.broker_split_amount ?? ""} onChange={(x) => setE({ ...e, broker_split_amount: x.target.value })} /></Field>
          <Field label="Referral split $ (blank = terms)"><input style={input} type="number" value={e.referral_split_amount ?? ""} onChange={(x) => setE({ ...e, referral_split_amount: x.target.value })} /></Field>
          <Field label="Notes"><input style={input} value={e.notes} onChange={(x) => setE({ ...e, notes: x.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 8 }}>
          <Btn primary disabled={busy || e.amount === ""} onClick={() => void run(() => acApi.addLedger(c.id, Object.fromEntries(Object.entries(e).filter(([, v]) => v !== ""))), () => setE({ ...e, amount: "", notes: "", period_label: "", expected_payment_id: "", document_id: "" }))}>Record</Btn>
          <span style={{ ...muted, marginLeft: 8 }}>Entries are permanent. A mistake is fixed with Correct, which adds a reversing entry.</span>
        </div>
      </div>
      <div style={card}>
        <h3 style={h3}>Ledger</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead><tr><th style={th}>Date</th><th style={th}>Type</th><th style={th}>Amount</th><th style={th}>Splits</th><th style={th}>Period</th><th style={th}>Notes</th><th style={th}>By</th><th style={th} /></tr></thead>
            <tbody>
              {d.ledger.length === 0 ? <tr><td style={td} colSpan={8}>No entries.</td></tr> : d.ledger.map((l) => (
                <tr key={l.id} style={{ opacity: l.corrected ? 0.6 : 1 }}>
                  <td style={td}>{day(l.effective_on)}</td>
                  <td style={td}>{label(l.entry_type)}{l.corrected ? " (corrected)" : ""}{l.is_revenue ? "" : <span style={muted}> - activity</span>}</td>
                  <td style={td}>{money(Number(l.amount), true)}</td>
                  <td style={td}>{Number(l.broker_split_amount) || Number(l.referral_split_amount) ? `${money(Number(l.broker_split_amount), true)} / ${money(Number(l.referral_split_amount), true)}` : "-"}</td>
                  <td style={td}>{l.period_label ?? ""}</td>
                  <td style={td}>{l.notes ?? ""}</td>
                  <td style={td}>{l.created_by_name ?? "System"}</td>
                  <td style={td}>{!l.corrected && l.entry_type !== "correction" && l.entry_type !== "funding" ? (
                    <Btn disabled={busy} onClick={() => { const reason = window.prompt("Why is this entry being corrected?"); if (reason) void run(() => acApi.correctLedger(c.id, l.id, reason)); }}>Correct</Btn>
                  ) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
