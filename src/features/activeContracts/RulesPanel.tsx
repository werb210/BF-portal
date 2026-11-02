// BF_PORTAL_v864_ACTIVE_CONTRACTS - Renewal Rules: the rule in force (contract override > lender product > starting
// default), an override for this contract, a manual "eligible now", and the end-of-term terms (residual / balloon,
// buyout option and price, end-of-term date) that feed the engine's end-of-term prompts.
import { useState } from "react";
import { acApi, errorText, type Detail } from "./api";
import { Btn, card, day, ErrorLine, Field, h3, input, label, muted, Row } from "./ui";

const RULES: Array<[string, string]> = [
  ["", "Use the lender product's rule"], ["percent_paid", "Percentage paid down"], ["months_before_maturity", "Months before maturity"],
  ["specific_date", "Specific eligibility date"], ["manual", "Manual"], ["not_renewable", "Not renewable"],
];

export default function RulesPanel({ d, onChanged }: { d: Detail; onChanged: () => void }) {
  const c = d.contract;
  const own = (c.renewal_rule ?? {}) as Record<string, unknown>;
  const [type, setType] = useState(String(own.rule_type ?? ""));
  const [pct, setPct] = useState(String(own.percent_threshold ?? "50"));
  const [months, setMonths] = useState(String(own.months_before_maturity ?? "3"));
  const [date, setDate] = useState(c.renewal_eligible_on ?? "");
  const [eot, setEot] = useState({ end_of_term_date: c.end_of_term_date ?? "", residual_amount: c.residual_amount != null ? String(c.residual_amount) : "", buyout_option: c.buyout_option ?? "", buyout_price: c.buyout_price != null ? String(c.buyout_price) : "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };
  const saveRule = () => run(() => acApi.patch(c.id, {
    renewal_rule: type ? { rule_type: type, ...(type === "percent_paid" ? { percent_threshold: Number(pct), approach_points: 10 } : {}), ...(type === "months_before_maturity" ? { months_before_maturity: Number(months) } : {}) } : null,
    renewal_eligible_on: type === "specific_date" ? date || null : c.renewal_eligible_on,
  }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
      <ErrorLine text={err} />
      <div style={card}>
        <h3 style={h3}>Rule in force</h3>
        <Row k="Rule" v={c.rule.description} />
        <Row k="Set on" v={c.rule.source === "contract" ? "This contract" : c.rule.source === "product" ? "Lender product" : "Starting default (set the product's rule on the Lenders page)"} />
        <Row k="Eligibility" v={label(c.renewal.eligibility)} />
        {c.renewal.eligible_on ? <Row k="Eligible on (est.)" v={day(c.renewal.eligible_on)} /> : null}
        <div style={{ marginTop: 8 }}>
          <Btn disabled={busy || c.is_history} onClick={() => void run(() => acApi.patch(c.id, { manual_renewal_eligible: !c.manual_renewal_eligible }))}>
            {c.manual_renewal_eligible ? "Clear manual eligibility" : "Mark eligible now"}
          </Btn>
        </div>
      </div>
      <div style={card}>
        <h3 style={h3}>Override for this contract</h3>
        <Field label="Trigger"><select style={input} value={type} onChange={(e) => setType(e.target.value)}>{RULES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        {type === "percent_paid" ? <Field label="Eligible after % repaid"><input style={input} type="number" value={pct} onChange={(e) => setPct(e.target.value)} /></Field> : null}
        {type === "months_before_maturity" ? <Field label="Months before maturity"><input style={input} type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></Field> : null}
        {type === "specific_date" ? <Field label="Eligible on"><input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field> : null}
        <div style={{ marginTop: 8 }}><Btn primary disabled={busy} onClick={() => void saveRule()}>Save rule</Btn></div>
      </div>
      <div style={card}>
        <h3 style={h3}>End of term</h3>
        <Field label="End-of-term date"><input style={input} type="date" value={eot.end_of_term_date} onChange={(e) => setEot({ ...eot, end_of_term_date: e.target.value })} /></Field>
        <Field label="Residual / balloon $"><input style={input} type="number" value={eot.residual_amount} onChange={(e) => setEot({ ...eot, residual_amount: e.target.value })} /></Field>
        <Field label="Buyout option">
          <select style={input} value={eot.buyout_option} onChange={(e) => setEot({ ...eot, buyout_option: e.target.value })}>
            <option value="">Not set</option><option value="none">None</option><option value="fmv">Fair market value</option><option value="fixed">Fixed price</option><option value="one_dollar">$1 buyout</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="Buyout price $"><input style={input} type="number" value={eot.buyout_price} onChange={(e) => setEot({ ...eot, buyout_price: e.target.value })} /></Field>
        <div style={{ ...muted, margin: "6px 0" }}>Tasks are created 90 and 30 days before the end-of-term date.</div>
        <Btn disabled={busy} onClick={() => void run(() => acApi.patch(c.id, eot))}>Save end-of-term</Btn>
      </div>
    </div>
  );
}
