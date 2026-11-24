// BF_PORTAL_KS_SIGNATURES_v1 (2026-11-24) - Keystone settings: email signatures. Your personal Keystone signature (used
// when you send as yourself from a Keystone page) and the Keystone shared mailboxes' signatures (sales@, support@,
// info@...). Both are Keystone-branded and saved for silo KS; the Boreal Financial ones are untouched.
import { EmailSignaturePanel } from "@/pages/settings/tabs/ProfileSettings";
import SharedMailboxSignatures from "@/pages/settings/tabs/SharedMailboxSignatures";

export default function KsSettings() {
  return (
    <div style={{ padding: "16px 24px", display: "grid", gap: 24 }} data-testid="ks-settings">
      <h2 style={{ margin: 0, fontSize: 20 }}>Keystone settings</h2>
      <section>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Your Keystone signature</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>Added when you email from a Keystone page as yourself. Your Boreal Financial signature is separate.</p>
        <EmailSignaturePanel />
      </section>
      <section>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Keystone mailboxes</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>Each shared mailbox (Sales, Support, Info, Accounting, App) has its own signature. Only Admins can change these.</p>
        <SharedMailboxSignatures />
      </section>
    </div>
  );
}
