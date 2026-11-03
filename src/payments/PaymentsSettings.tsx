// BF_PORTAL_v872_PAYMENTS - Settings > Payments (Admins): whether Stripe is set up on the server (Boreal's own account,
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET), what the account can take (card, pre-authorized debit), the webhook
// address to give Stripe, and the fee payments report. Ported from KS-Portal #41, on Boreal's own account.
import { useCallback, useEffect, useState } from "react";
import { Notice, Section, cell, copyText, errText, muted, quiet } from "@/settingsPack/ui";
import { money, paymentsApi, type PaymentSettings, type PaymentsReport } from "./paymentsApi";
import { TechnicalDetails, settingNamesIn, withoutSettingNames } from "@/components/SetupNotice";

/** The fee payments numbers (Reports > Fee payments draws the same table from /api/reports/data/fee_payments). */
export function FeePaymentsTable({ r }: { r: PaymentsReport | null | undefined }) {
  if (!r?.paid) return <p style={muted}>Nothing to show yet.</p>;
  return (
    <div data-testid="fee-payments-table">
      <table style={{ borderCollapse: "collapse", marginBottom: 8 }}>
        <tbody>
          <tr><td style={cell}>Collected</td><td style={cell} data-testid="report-paid"><strong>{money(r.paid.amount)}</strong> ({r.paid.count}{r.paid.card !== undefined ? `: ${r.paid.card} by card, ${r.paid.bank_debit ?? 0} by bank debit` : ""})</td></tr>
          <tr><td style={cell}>Bank debits processing</td><td style={cell}>{money(r.processing.amount)} ({r.processing.count})</td></tr>
          <tr><td style={cell}>Waiting for payment</td><td style={cell}>{money(r.outstanding.amount)} ({r.outstanding.count})</td></tr>
          <tr><td style={cell}>Failed</td><td style={cell}>{r.failed}</td></tr>
        </tbody>
      </table>
      {r.by_month.length > 0 && <p style={muted}>{r.by_month.map((m) => `${m.month}: ${money(m.amount)}`).join(" | ")}</p>}
    </div>
  );
}

export function FeePaymentsReport() {
  const [r, setR] = useState<PaymentsReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void paymentsApi.report(90).then(setR).catch((e) => setErr(errText(e, "Could not load the payments report."))); }, []);
  return (
    <Section id="fee-payments-report" title="Fee payments (last 90 days)" intro="Payment links sent from applications and contacts you can see, in the silo you are working in.">
      <Notice error={err} />
      {r && <FeePaymentsTable r={r} />}
    </Section>
  );
}

export default function PaymentsSettings() {
  const [view, setView] = useState<PaymentSettings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setView(await paymentsApi.settings()); } catch (e) { setErr(errText(e, "Could not load the payment settings.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const a = view?.account ?? null;

  return (
    <div data-testid="payments-settings">
      <Section id="stripe" title="Stripe" intro="Clients pay broker fees by card or by Canadian pre-authorized debit through Boreal's own Stripe account. The money goes straight to Boreal's Stripe balance.">
        <Notice error={err} ok={ok} />
        {view?.problem && <div style={muted} data-testid="stripe-problem">
          <p style={{ margin: 0 }}>{withoutSettingNames(view.problem) || "Online payments are not set up yet."} The person who manages the server adds the Stripe keys there, then you reload this page.</p>
          <TechnicalDetails names={settingNamesIn(view.problem)} />
        </div>}
        {view?.configured && <>
          <table style={{ borderCollapse: "collapse", marginBottom: 10 }}>
            <tbody>
              <tr><td style={cell}>Account</td><td style={cell} data-testid="stripe-account">{a?.business_name ?? "Boreal's Stripe account"}{a?.id ? ` (${a.id})` : ""}{view.livemode === false ? " - test mode" : ""}</td></tr>
              <tr><td style={cell}>Card payments</td><td style={cell}>{a?.charges_enabled === false ? "Not yet - finish setting up the account in Stripe" : a ? "On" : "Could not check with Stripe just now"}</td></tr>
              <tr><td style={cell}>Pre-authorized debit (bank)</td><td style={cell}>{a?.acss_debit_enabled ? "On" : a?.acss_debit_enabled === false ? "Off - turn on \"Canadian pre-authorized debits\" in Stripe (Settings > Payment methods)" : "Could not check with Stripe just now"}</td></tr>
            </tbody>
          </table>
        </>}
        {view && <>
          <p style={muted}>Stripe webhook address (Developers &gt; Webhooks, events: {view.webhook_events.join(", ")}):</p>
          <p style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code data-testid="stripe-webhook-url" style={{ fontSize: 12, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", wordBreak: "break-all" }}>{view.webhook_url}</code>
            <button type="button" style={quiet} onClick={() => void copyText(view.webhook_url).then((c) => setOk(c ? "Webhook address copied." : null))}>Copy</button>
          </p>
          <p style={muted}>A paid fee on an application with a QuickBooks fee invoice is recorded against that invoice automatically. Refunds are made in Stripe.</p>
        </>}
      </Section>
      {view?.configured && <FeePaymentsReport />}
    </div>
  );
}
