// BF_PORTAL_v789_BI_ACTIVITY - "Email" on a BI record logs an email that was sent or received
// outside the portal. It is written to BI-Server only; BF-Server's mailbox is not involved.
import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import type { Scope } from "@/api/crm";
import { logBiActivity } from "@/api/biCrmActivity";

export function EmailLogPopup({ scope, defaultEmail, onClose, onLogged }: {
  scope: Scope; defaultEmail?: string; onClose: () => void; onLogged: () => void;
}): JSX.Element {
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [address, setAddress] = useState(defaultEmail ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (saving) return;
    setSaving(true); setErr(null);
    try {
      await logBiActivity(scope, {
        event_type: "email",
        body: body.trim(),
        meta: { direction, address: address.trim(), subject: subject.trim() },
      });
      onLogged();
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not log the email.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PopupShell
      title="Log email"
      onClose={onClose}
      primaryAction={{ label: saving ? "Saving..." : "Log email", disabled: (!subject.trim() && !body.trim()) || saving, onClick: save }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
        <select aria-label="Direction" value={direction} onChange={(e) => setDirection(e.target.value as "outbound" | "inbound")} style={popupInputStyle}>
          <option value="outbound">Sent</option>
          <option value="inbound">Received</option>
        </select>
        <input aria-label="Email address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="name@example.com" style={popupInputStyle} />
      </div>
      <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" style={{ ...popupInputStyle, marginBottom: 8 }} />
      <textarea spellCheck lang="en-CA"
        aria-label="Email text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        placeholder="What the email said"
        style={popupInputStyle}
      />
      {address.trim() && (
        <p style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 8 }}>
          To write the email itself, <a href={`mailto:${address.trim()}`} style={{ color: "var(--ui-text)" }}>open your mail app</a>, then log it here.
        </p>
      )}
      {err && <div role="alert" style={{ color: "var(--ui-text-danger)", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
