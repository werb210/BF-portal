// BF_PORTAL_v864_ACTIVE_CONTRACTS - Commission: the model and terms (splits included), the expected-payment schedule
// with received / variance per payment, and the Finance review of variances. Expected is never counted as received.
import { useContext, useState } from "react";
import { AuthContext } from "@/auth/AuthContext";
import { acApi, errorText, type Detail } from "./api";
import { Btn, card, day, ErrorLine, Field, h3, input, label, money, muted, Pill, Row, table, td, th } from "./ui";

const MODELS = ["upfront", "monthly_recurring", "residual", "revenue_share", "profit_share", "fixed_recurring", "combination", "other"];
const TERM_FIELDS: Array<[string, string]> = [
  ["upfront_percent", "Upfront %"], ["upfront_amount", "Upfront $"], ["monthly_amount", "Monthly $"], ["residual_percent", "Residual %"],
  ["revenue_share_percent", "Revenue share %"], ["profit_share_percent", "Profit share %"], ["fixed_amount", "Fixed recurring $"],
  ["broker_split_percent", "Broker / agent split %"], ["referral_split_percent", "Referral split %"],
];

export default function CommissionPanel({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const c = d.contract;
  const auth = useContext(AuthContext);
  const isAdmin = String(auth?.user?.role ?? "").toLowerCase() === "admin";
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState(c.commission_model ?? "");
  const [terms, setTerms] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(c.commission_terms ?? {}).map(([k, v]) => [k, String(v ?? "")])));
  const [exp, setExp] = useState({ kind: "profit_share", due_on: "", expected_amount: "", months: "1", note: "" });
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  const r = d.revenue;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorLine text={err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <div style={card}>
          <h3 style={h3}>Revenue (received)</h3>
          <Row k="Current month" v={money(r.current_month, true)} />
          <Row k="YTD" v={money(r.ytd, true)} />
          <Row k="Lifetime (net of splits)" v={money(r.lifetime, true)} />
          <Row k="Lifetime (gross)" v={money(r.lifetime_gross, true)} />
          <Row k="Expected future" v={money(r.expected_future, true)} />
          <div style={{ ...muted, marginTop: 6 }}>Expected payments count only once a receipt is recorded in the ledger.</div>
        </div>
        <div style={card}>
          <h3 style={h3}>Compensation terms</h3>
          <Field label="Commission model">
            <select style={input} value={model} onChange={(x) => setModel(x.target.value)}><option value="">Not set</option>{MODELS.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
            {TERM_FIELDS.map(([k, l]) => <Field key={k} label={l}><input style={input} type="number" value={terms[k] ?? ""} onChange={(x) => setTerms({ ...terms, [k]: x.target.value })} /></Field>)}
            <Field label="Broker / agent name"><input style={input} value={terms.broker_name ?? ""} onChange={(x) => setTerms({ ...terms, broker_name: x.target.value })} /></Field>
            <Field label="Referral partner"><input style={input} value={terms.referral_name ?? ""} onChange={(x) => setTerms({ ...terms, referral_name: x.target.value })} /></Field>
          </div>
          <Field label="Notes"><input style={input} value={terms.notes ?? ""} onChange={(x) => setTerms({ ...terms, notes: x.target.value })} /></Field>
          <div style={{ marginTop: 8 }}><Btn primary disabled={busy} onClick={() => void run(() => acApi.compensation(c.id, { commission_model: model || null, commission_terms: terms }))}>Save terms</Btn></div>
        </div>
      </div>
      <div style={card}>
        <h3 style={h3}>Expected payment schedule</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
          <Field label="Kind"><select style={input} value={exp.kind} onChange={(x) => setExp({ ...exp, kind: x.target.value })}>
            {["upfront", "monthly_recurring", "residual", "revenue_share", "profit_share", "fixed_recurring", "other"].map((k) => <option key={k} value={k}>{label(k)}</option>)}
          </select></Field>
          <Field label="First due"><input style={input} type="date" value={exp.due_on} onChange={(x) => setExp({ ...exp, due_on: x.target.value })} /></Field>
          <Field label="Expected $"><input style={input} type="number" value={exp.expected_amount} onChange={(x) => setExp({ ...exp, expected_amount: x.target.value })} /></Field>
          <Field label="Months (1 = once)"><input style={{ ...input, width: 80 }} type="number" min={1} max={120} value={exp.months} onChange={(x) => setExp({ ...exp, months: x.target.value })} /></Field>
          <Btn disabled={busy || !exp.due_on || exp.expected_amount === ""} onClick={() => void run(() => acApi.addExpected(c.id, exp))}>Add to schedule</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead><tr><th style={th}>Due</th><th style={th}>Period</th><th style={th}>Kind</th><th style={th}>Expected</th><th style={th}>Received</th><th style={th}>Variance</th><th style={th}>Status</th><th style={th} /></tr></thead>
            <tbody>
              {r.schedule.length === 0 ? <tr><td style={td} colSpan={8}>No expected payments.</td></tr> : r.schedule.map((s) => (
                <tr key={s.id}>
                  <td style={td}>{day(s.due_on)}</td><td style={td}>{s.period_label ?? ""}</td><td style={td}>{label(s.kind)}</td>
                  <td style={td}>{money(s.expected_amount, true)}</td><td style={td}>{money(s.received, true)}</td>
                  <td style={{ ...td, fontWeight: s.variance ? 700 : 400 }}>{s.variance ? money(s.variance, true) : "-"}</td>
                  <td style={td}>{s.flagged ? <Pill kind="default">{label(s.status)} - review</Pill> : <Pill kind={s.status === "received" ? "active" : "estimated"}>{label(s.status)}{s.reviewed ? " (reviewed)" : ""}</Pill>}</td>
                  <td style={td}>{s.flagged && isAdmin ? (
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      <Btn disabled={busy} onClick={() => void run(() => acApi.reviewExpected(c.id, s.id))}>Mark reviewed</Btn>
                      {s.status === "missed" ? <Btn disabled={busy} onClick={() => void run(() => acApi.reviewExpected(c.id, s.id, true))}>Waive</Btn> : null}
                    </span>
                  ) : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {r.variances.length && !isAdmin ? <div style={{ ...muted, marginTop: 6 }}>Variances are reviewed by Finance / Admin.</div> : null}
      </div>
    </div>
  );
}
