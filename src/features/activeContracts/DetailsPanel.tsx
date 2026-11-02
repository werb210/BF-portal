// BF_PORTAL_v864_ACTIVE_CONTRACTS - Contract Details: key details, renewal information with Start Renewal, Boreal
// compensation, recent activity (from the CRM Timeline), the maturity outcome / status, and editing the details.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCrmBase } from "@/pages/crm/crmBase";
import { acApi, errorText, type Detail } from "./api";
import { balanceSource, Btn, card, day, ErrorLine, Field, h3, input, label, money, muted, Progress, Row } from "./ui";
import type { DetailTab } from "./ContractDetail";

const STATUS_CHOICES: Array<[string, string]> = [
  ["active", "Active"], ["renewal_upcoming", "Renewal Upcoming"], ["renewal_eligible", "Renewal Eligible"], ["renewal_in_progress", "Renewal In Progress"],
  ["refinanced", "Refinanced"], ["paid_out", "Paid Out"], ["matured", "Matured"], ["closed", "Closed"], ["default", "Default / Problem Account"],
];
const FREQ = ["daily", "weekly", "biweekly", "semi_monthly", "monthly", "quarterly", "annually", "other"];

export default function DetailsPanel({ d, onChanged, goTo }: { d: Detail; onChanged: () => void; goTo: (t: DetailTab) => void }) {
  const c = d.contract;
  const crmBase = useCrmBase();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newApp, setNewApp] = useState<string | null>(c.open_opportunity_application_id);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(c.status);
  const [note, setNote] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const startRenewal = () => run(async () => { const r = await acApi.startRenewal(c.id); setNewApp(r.applicationId); });
  const field = (k: string, l: string, type = "text") => (
    <Field label={l}><input style={input} type={type} defaultValue={String((c as unknown as Record<string, unknown>)[k] ?? "")} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} /></Field>
  );
  const pct = c.balance.percent_paid;
  const threshold = c.rule.rule_type === "percent_paid" ? Number(c.rule.percent_threshold ?? 50) : null;
  return (
    <div>
      <ErrorLine text={err} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
        <div style={card}>
          <h3 style={h3}>Key Details</h3>
          <Row k="Original Amount" v={money(c.original_amount)} />
          <Row k="Funding Date" v={day(c.funded_at)} />
          <Row k="Original Term" v={c.term_months ? `${c.term_months} months` : "n/a"} />
          <Row k="Current Balance" v={money(c.balance.balance)} />
          <Row k="Balance Source" v={balanceSource(c.balance)} />
          <Row k="Amount Paid" v={c.balance.balance !== null && c.balance.total_repayable ? `${money(c.balance.total_repayable - c.balance.balance)}${pct !== null ? ` (${Math.round(pct)}%)` : ""}` : "n/a"} />
          <Row k="Maturity Date" v={day(c.maturity_date)} />
          <Row k="Payment" v={c.payment_amount ? `${money(c.payment_amount, true)} ${label(c.payment_frequency)}` : label(c.payment_frequency)} />
          <Row k="Facility Type" v={c.facility_type ?? "-"} />
          <Row k="Account Owner" v={c.owner_name ?? "-"} />
          {c.end_of_term_date ? <Row k="End of Term" v={`${day(c.end_of_term_date)}${c.buyout_option ? ` - buyout ${label(c.buyout_option)}${c.buyout_price ? ` ${money(c.buyout_price)}` : ""}` : ""}`} /> : null}
          {c.residual_amount ? <Row k="Residual / Balloon" v={money(c.residual_amount)} /> : null}
        </div>
        <div style={card}>
          <h3 style={h3}>Renewal Information</h3>
          <Row k="Renewal Rule" v={c.rule.description} />
          <Row k="Eligibility" v={label(c.renewal.eligibility)} />
          {c.renewal.eligible_on ? <Row k="Eligible On (est.)" v={day(c.renewal.eligible_on)} /> : null}
          {c.renewal.days_to_maturity !== null ? <Row k="Days to Maturity" v={c.renewal.days_to_maturity} /> : null}
          <div style={{ margin: "8px 0" }}><Progress pct={pct} />{threshold !== null ? <div style={muted}>Threshold {threshold}%{pct !== null && pct >= threshold ? " - renewal threshold met" : ""}</div> : null}</div>
          <div style={{ fontWeight: 700, fontSize: 13, margin: "8px 0 4px", color: "var(--ui-text)" }}>Next Action</div>
          <div style={{ fontSize: 13, marginBottom: 8, color: "var(--ui-text)" }}>{c.next_action}</div>
          {!c.is_history && c.renewal.eligibility !== "not_renewable" ? (
            <>
              <Btn primary disabled={busy} onClick={() => void startRenewal()}>{newApp ? "Renewal application started" : "Start Renewal Opportunity"}</Btn>
              <div style={{ ...muted, marginTop: 4 }}>Creates a new application pre-filled with the client's information; only refreshed documents are asked for.</div>
              {newApp ? <div style={{ marginTop: 6 }}><Link to={`/applications/${newApp}`} style={{ color: "var(--ui-accent-fg)" }}>Open the renewal application</Link></div> : null}
            </>
          ) : null}
        </div>
        <div style={card}>
          <h3 style={h3}>Boreal Compensation</h3>
          <Row k="Commission Model" v={label(c.commission_model)} />
          <Row k="Received This Month" v={money(d.revenue.current_month, true)} />
          <Row k="YTD Received" v={money(d.revenue.ytd, true)} />
          <Row k="Lifetime Revenue" v={money(d.revenue.lifetime, true)} />
          <Row k="Expected Future" v={money(d.revenue.expected_future, true)} />
          <Row k="Next Expected Payment" v={d.revenue.next_expected ? `${day(d.revenue.next_expected.due_on)} ${money(d.revenue.next_expected.expected_amount, true)}` : "-"} />
          {d.revenue.variances.length ? <div style={{ fontSize: 12, color: "var(--ui-text)", fontWeight: 700, marginTop: 4 }}>{d.revenue.variances.length} variance(s) for review</div> : null}
          <div style={{ marginTop: 8 }}><Btn onClick={() => goTo("ledger")}>View Payment History</Btn></div>
        </div>
        <div style={card}>
          <h3 style={h3}>Recent Activity</h3>
          {d.activity.length === 0 ? <div style={muted}>No activity yet.</div> : d.activity.slice(0, 6).map((a) => (
            <div key={a.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--ui-border-soft, var(--ui-border))" }}>
              <div style={{ fontSize: 13, color: "var(--ui-text)" }}>{a.title}</div>
              <div style={muted}>{day(a.created_at)}{a.detail ? ` - ${a.detail.slice(0, 80)}` : ""}</div>
            </div>
          ))}
          {c.company_id ? <div style={{ marginTop: 8 }}><Link to={`${crmBase}/companies/${c.company_id}`} style={{ color: "var(--ui-accent-fg)", fontSize: 13 }}>View Full Timeline</Link></div> : null}
        </div>
      </div>
      <div style={{ ...card, marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <Field label="Status / maturity outcome">
          <select style={input} value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_CHOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Note"><input style={{ ...input, minWidth: 220 }} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Btn disabled={busy || status === c.status} onClick={() => void run(() => acApi.status(c.id, status, note))}>Save status</Btn>
        <span style={{ flex: 1 }} />
        <Btn onClick={() => setEditing((v) => !v)}>{editing ? "Close editing" : "Edit details"}</Btn>
      </div>
      {editing ? (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
            {field("lender_name", "Lender")}{field("product_name", "Product")}{field("product_category", "Product type (TERM, MCA, ...)")}{field("facility_type", "Facility type")}
            {field("original_amount", "Original amount", "number")}{field("funded_at", "Funding date", "date")}{field("term_months", "Term (months)", "number")}
            {field("maturity_date", "Maturity date", "date")}{field("interest_rate", "Interest rate (% / yr)", "number")}{field("factor_rate", "Factor rate (MCA)", "number")}
            {field("payment_amount", "Payment amount", "number")}
            <Field label="Payment frequency"><select style={input} defaultValue={c.payment_frequency ?? ""} onChange={(e) => setForm((f) => ({ ...f, payment_frequency: e.target.value }))}><option value="">-</option>{FREQ.map((x) => <option key={x} value={x}>{label(x)}</option>)}</select></Field>
            {field("internal_notes", "Internal notes (staff only)")}
          </div>
          <div style={{ marginTop: 8 }}><Btn primary disabled={busy || !Object.keys(form).length} onClick={() => void run(async () => { await acApi.patch(c.id, form); setForm({}); setEditing(false); })}>Save details</Btn></div>
        </div>
      ) : null}
    </div>
  );
}
