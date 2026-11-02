// BF_PORTAL_v864_ACTIVE_CONTRACTS - CRM > Active Contracts: the whole portfolio and the re-engagement queues
// (renewal eligible now / 30 / 60 / 90 days, maturing, no contact, approaching 50% paid, paid-out clients with no new
// facility, equipment add-ons, multiple facilities, upcoming maturities, outcomes, variances), lender statements
// waiting for review, and (Admin) the automation settings.
import { useCallback, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "@/auth/AuthContext";
import { acApi, errorText, type Contract, type Review, type Settings, type Summary } from "./api";
import ContractsTable from "./ContractsTable";
import ContractDetail from "./ContractDetail";
import { ReviewRow } from "./DocumentsPanel";
import { KpiTiles } from "./Summary";
import { Btn, card, ErrorLine, Field, h3, input, muted } from "./ui";

export default function ActiveContractsPage() {
  const auth = useContext(AuthContext);
  const isAdmin = String(auth?.user?.role ?? "").toLowerCase() === "admin";
  const [all, setAll] = useState<{ contracts: Contract[]; summary: Summary } | null>(null);
  const [queues, setQueues] = useState<{ titles: Record<string, string>; counts: Record<string, number> } | null>(null);
  const [queue, setQueue] = useState<string>("");
  const [rows, setRows] = useState<Contract[] | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [months, setMonths] = useState(6);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [a, q, r] = await Promise.all([acApi.list(), acApi.queues(), acApi.reviews()]);
      setAll(a); setQueues(q); setReviews(r.reviews ?? []); setErr(null);
    } catch (e) { setErr(errorText(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!queue) { setRows(null); return; }
    let alive = true;
    acApi.queue(queue, queue === "no_contact" ? months : undefined).then((r) => { if (alive) setRows(r.contracts ?? []); }).catch((e) => { if (alive) setErr(errorText(e)); });
    return () => { alive = false; };
  }, [queue, months]);
  return (
    <div style={{ padding: 16, display: "grid", gap: 12, color: "var(--ui-text)" }} data-testid="active-contracts-page">
      <h1 style={{ fontSize: 20, margin: 0 }}>Active Contracts</h1>
      <ErrorLine text={err} />
      {all ? <KpiTiles s={all.summary} /> : <div style={muted}>Loading...</div>}
      {queues ? (
        <div style={card}>
          <h3 style={h3}>Re-engagement queues</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <QueueChip active={queue === ""} onClick={() => setQueue("")} text={`All contracts (${all?.contracts.length ?? 0})`} />
            {Object.entries(queues.titles).map(([k, t]) => (
              <QueueChip key={k} active={queue === k} onClick={() => setQueue(k)} text={`${k === "no_contact" ? `No contact in ${months} months` : t} (${queues.counts[k] ?? 0})`} />
            ))}
          </div>
          {queue === "no_contact" ? <div style={{ marginTop: 8 }}><Field label="Months without contact"><input style={{ ...input, width: 90 }} type="number" min={1} max={60} value={months} onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 6))} /></Field></div> : null}
        </div>
      ) : null}
      {reviews.length ? (
        <div style={card}>
          <h3 style={h3}>Lender statements waiting for review ({reviews.length})</h3>
          <div style={{ ...muted, marginBottom: 6 }}>Read from email or uploads. Nothing changes a balance until you confirm it. A statement that could not be matched needs its contract id (open the contract to copy it).</div>
          {reviews.map((r) => <ReviewRow key={r.id} r={r} contractId={r.contract_id} onDone={() => void load()} />)}
        </div>
      ) : null}
      {all ? (
        <ContractsTable showCompany title={queue ? queues?.titles[queue] ?? "Queue" : "All contracts"} contracts={queue ? rows ?? [] : all.contracts}
          onChanged={() => void load()} openId={openId} setOpenId={setOpenId} />
      ) : null}
      {isAdmin ? <SettingsCard /> : null}
    </div>
  );
}

function QueueChip({ active, onClick, text }: { active: boolean; onClick: () => void; text: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{ border: active ? "1px solid #1e3a8a" : "1px solid var(--ui-border)", background: active ? "#1e3a8a" : "var(--ui-surface-strong)", color: active ? "#ffffff" : "var(--ui-text)", borderRadius: 999, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
      {text}
    </button>
  );
}

function SettingsCard() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { acApi.settings().then((r) => setS(r.settings)).catch((e) => setErr(errorText(e))); }, []);
  if (!s) return <ErrorLine text={err} />;
  const save = async () => {
    try { setS((await acApi.saveSettings(s)).settings); setMsg("Saved."); setErr(null); } catch (e) { setErr(errorText(e)); }
  };
  return (
    <div style={card} data-testid="ac-settings">
      <h3 style={h3}>Renewal automation (Admin)</h3>
      <div style={{ ...muted, marginBottom: 8 }}>Off by default. When on, the renewal engine sends this message when a contract becomes renewal eligible or reaches 90 / 60 days before maturity - only to clients with valid consent, never in quiet hours (9pm-9am), and every message is written on the CRM Timeline. Tokens: {"{{first_name}} {{company}} {{lender}}"}.</div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={s.auto_email} onChange={(e) => setS({ ...s, auto_email: e.target.checked })} /> Send the renewal email automatically</label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={s.auto_sms} onChange={(e) => setS({ ...s, auto_sms: e.target.checked })} /> Send the renewal text automatically (consented Canadian mobiles only)</label>
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        <Field label="Email subject"><input style={input} value={s.email_subject ?? ""} onChange={(e) => setS({ ...s, email_subject: e.target.value })} placeholder="Reviewing your financing options" /></Field>
        <Field label="Email body"><textarea style={{ ...input, minHeight: 90 }} value={s.email_body ?? ""} onChange={(e) => setS({ ...s, email_body: e.target.value })} /></Field>
        <Field label="Text message"><input style={input} value={s.sms_body ?? ""} onChange={(e) => setS({ ...s, sms_body: e.target.value })} placeholder="Must include: Reply STOP to opt out." /></Field>
        <Field label="'No contact' queue: months"><input style={{ ...input, width: 90 }} type="number" value={s.no_contact_months} onChange={(e) => setS({ ...s, no_contact_months: Number(e.target.value) || 6 })} /></Field>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={s.client_portal} onChange={(e) => setS({ ...s, client_portal: e.target.checked })} /> Client portal view (also needs ACTIVE_CONTRACTS_CLIENT_ENABLED=on on the server; no client screen yet)</label>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}><Btn primary onClick={() => void save()}>Save settings</Btn>{msg ? <span style={muted}>{msg}</span> : null}</div>
      <ErrorLine text={err} />
    </div>
  );
}

/** /crm/active-contracts/:id - one contract on its own page (Timeline rows link here). */
export function ContractPage() {
  const { id = "" } = useParams();
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, margin: "0 0 12px", color: "var(--ui-text)" }}>Contract</h1>
      <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, overflow: "hidden" }}><ContractDetail contractId={id} /></div>
    </div>
  );
}
