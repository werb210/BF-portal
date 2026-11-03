// BF_PORTAL_v872_PAYMENTS - "Payments" on an application or a contact (ported from KS-Portal #41): request a fee by
// payment link (card or Canadian pre-authorized debit through Boreal's own Stripe account), send it by email or text,
// and see whether it was paid, is processing (bank debit) or failed. The fee on a file with a signed fee agreement is
// filled in for you.
import { useCallback, useEffect, useState } from "react";
import { Notice, Section, Toggle, button, cell, copyText, errText, input, muted, quiet, danger, when } from "@/settingsPack/ui";
import { QBO_TEXT, STATUS, money, paymentsApi, type PaymentLink } from "./paymentsApi";
import { withoutSettingNames } from "@/components/SetupNotice";

type Props = { applicationId?: string; contactId?: string };

export function StatusPill({ status }: { status: PaymentLink["status"] }) {
  const s = STATUS[status] ?? STATUS.open;
  return <span data-testid="payment-status" style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: s.fg, background: s.bg }}>{s.label}</span>;
}

export default function PaymentLinksPanel({ applicationId, contactId }: Props) {
  const rec = applicationId ? { application_id: applicationId } : { contact_id: contactId };
  const [links, setLinks] = useState<PaymentLink[] | null>(null);
  const [connected, setConnected] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Broker fee");
  const [card, setCard] = useState(true);
  const [debit, setDebit] = useState(true);
  const [byEmail, setByEmail] = useState(true);
  const [byText, setByText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await paymentsApi.links(rec);
      setLinks(r.links); setConnected(r.configured); setProblem(r.problem);
    } catch (e) { setErr(errText(e, "Could not load payments.")); }
  }, [applicationId, contactId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  const startNew = async () => {
    setOpen(true); setErr(null); setOk(null);
    if (applicationId && !amount) {
      try {
        const s = await paymentsApi.feeSuggestion(applicationId);
        if (s.fee) { setAmount(String(s.fee.amount)); setDescription(s.fee.description); }
      } catch { /* no suggestion: the broker types the amount */ }
    }
  };

  const create = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const methods = [card ? "card" : null, debit ? "acss_debit" : null].filter(Boolean);
      const r = await paymentsApi.create({ ...rec, amount, description, methods, send: { email: byEmail, sms: byText } });
      const refused = Object.values(r.refused ?? {});
      setOk(r.sent.length ? `Payment link sent by ${r.sent.map((c) => (c === "sms" ? "text" : c)).join(" and ")}.` : "Payment link created. Copy it to share it.");
      if (refused.length) setErr(refused.join(" "));
      setOpen(false); setAmount("");
      await load();
    } catch (e) { setErr(errText(e, "Could not create the payment link.")); } finally { setBusy(false); }
  };

  const resend = async (l: PaymentLink, channel: "email" | "sms") => {
    setErr(null); setOk(null);
    try {
      const r = await paymentsApi.send(l.id, { email: channel === "email", sms: channel === "sms" });
      const refused = Object.values(r.refused ?? {});
      if (r.sent.length) setOk(`Sent again by ${channel === "sms" ? "text" : "email"}.`);
      if (refused.length) setErr(refused.join(" "));
      await load();
    } catch (e) { setErr(errText(e, "Could not send the link.")); }
  };

  const cancel = async (l: PaymentLink) => {
    if (!window.confirm(`Cancel the payment link for ${money(l.amount)}? The client will no longer be able to pay with it.`)) return;
    try { await paymentsApi.cancel(l.id); await load(); } catch (e) { setErr(errText(e, "Could not cancel the link.")); }
  };

  return (
    <Section id="payment-links" title="Payments" intro="Ask the client to pay a fee online by card or pre-authorized debit. The money goes to Boreal's Stripe account.">
      {problem && <p style={muted} data-testid="payments-problem">{withoutSettingNames(problem) || "Online payments are not set up yet."} Ask an Admin to set this up in Settings &gt; Payments.</p>}
      <Notice error={err} ok={ok} />
      {links && links.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "8px 0" }}>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} data-testid={`payment-${l.id}`}>
                <td style={cell}><strong>{money(l.amount)}</strong><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{l.description}</div></td>
                <td style={cell}>
                  <StatusPill status={l.status} />
                  <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 4 }}>
                    {l.status === "paid" ? `Paid ${when(l.paid_at)}${l.payment_method_type ? ` by ${l.payment_method_type === "acss_debit" ? "bank debit" : "card"}` : ""}`
                      : l.status === "processing" ? `Bank debit authorized ${when(l.processing_at ?? null)}. It clears in about 3 to 5 business days.`
                      : l.status === "failed" ? (l.failure_message ?? "The payment failed.") + " The client can try again with the same link."
                      : l.sent_at ? `Sent ${when(l.sent_at)} by ${l.sent_channels.map((c) => (c === "sms" ? "text" : c)).join(" and ")}` : "Not sent yet"}
                  </div>
                  {QBO_TEXT[l.quickbooks_status] && <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{QBO_TEXT[l.quickbooks_status]}</div>}
                </td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>
                  {(l.status === "open" || l.status === "failed") && <>
                    <button type="button" style={quiet} onClick={() => void copyText(l.url).then((c) => setOk(c ? "Link copied." : `Copy this link: ${l.url}`))}>Copy link</button>{" "}
                    <button type="button" style={quiet} onClick={() => void resend(l, "email")}>Email again</button>{" "}
                    <button type="button" style={quiet} onClick={() => void resend(l, "sms")}>Text</button>{" "}
                    <button type="button" style={danger} onClick={() => void cancel(l)}>Cancel</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {links && links.length === 0 && !open && <p style={muted}>No payment requests yet.</p>}
      {!open && connected && !problem && <button type="button" style={button} onClick={() => void startNew()}>Request a payment</button>}
      {open && (
        <div data-testid="payment-form" style={{ marginTop: 8 }}>
          <label htmlFor="pl-amount" style={{ fontSize: 13 }}>Amount (CAD)</label>
          <input id="pl-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...input, maxWidth: 180, display: "block", margin: "4px 0 8px" }} />
          <label htmlFor="pl-desc" style={{ fontSize: 13 }}>What it is for</label>
          <input id="pl-desc" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, display: "block", margin: "4px 0 8px" }} />
          <Toggle id="pl-card" label="Card" checked={card} onChange={setCard} />
          <Toggle id="pl-debit" label="Bank debit (pre-authorized debit, clears in 3 to 5 business days)" checked={debit} onChange={setDebit} />
          <Toggle id="pl-email" label="Send by email" checked={byEmail} onChange={setByEmail} />
          <Toggle id="pl-text" label="Send by text (only if the client agreed to texts)" checked={byText} onChange={setByText} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={button} disabled={busy} onClick={() => void create()}>{byEmail || byText ? "Create and send" : "Create link"}</button>
            <button type="button" style={quiet} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </Section>
  );
}
