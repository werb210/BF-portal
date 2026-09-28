// BF_PORTAL_NOTIFY_CONTACT_v627
// "Notify" on a contact: one notice that goes to the client's Boreal app if it can
// be reached, otherwise by text message. BF-Server v626 decides the channel and
// records it on the contact's timeline.
import { useState, type CSSProperties } from "react";
import { api } from "@/api";

type NotifyResult = { ok?: boolean; channel?: string; error?: string };

export function notifyOutcome(r: NotifyResult | null | undefined): string {
  if (!r) return "Not sent.";
  if (r.ok && r.channel === "app") return "Sent to the client's Boreal app.";
  if (r.ok && r.channel === "sms") return "The app couldn't be reached, so it went by text message.";
  if (r.ok && r.channel === "bi") return "Sent to the Boreal Risk app (text message if they don't have it).";
  if (r.error === "no_phone") return "Not sent - this contact has no mobile number.";
  return "Not sent - " + String(r.error ?? "unknown error") + ".";
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const panel: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 10, padding: 20, width: "min(460px, 92vw)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", fontSize: 14, marginTop: 4, background: "var(--ui-surface)", color: "var(--ui-text)" };

export function NotifyContactButton({ contactId, contactName, buttonStyle, onSent }: { contactId: string; contactName?: string | null; buttonStyle: CSSProperties; onSent?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  const close = () => { setOpen(false); setTitle(""); setBody(""); setOutcome(null); };
  const send = async () => {
    if (!body.trim()) return;
    setBusy(true); setOutcome(null);
    try {
      const r = await api.post<NotifyResult>(`/api/crm/contacts/${encodeURIComponent(contactId)}/notify`, { title: title.trim(), body: body.trim() });
      setOutcome(notifyOutcome(r));
      if (r?.ok) { setTitle(""); setBody(""); onSent?.(); }
    } catch (error: any) {
      setOutcome("Not sent - " + String(error?.message ?? "the server did not answer") + ".");
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={buttonStyle} data-testid="contact-notify-button">Notify</button>
      {open && (
        <div style={overlay} role="dialog" aria-modal="true" aria-label="Notify contact" onClick={close}>
          <div style={panel} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Notify {contactName || "contact"}</h3>
            <div style={{ fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 12 }}>
              Goes to their Boreal app if they have it. If the app can't be reached, it goes by text message instead. It's added to the timeline either way.
            </div>
            <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Title (optional)
              <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Update on your application" style={input} data-testid="contact-notify-title" />
            </label>
            <label style={{ fontSize: 12, color: "var(--ui-text-muted)", display: "block", marginTop: 10 }}>Message
              <textarea value={body} maxLength={500} rows={4} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Please upload your latest bank statements." style={{ ...input, resize: "vertical" }} data-testid="contact-notify-body" />
            </label>
            <div style={{ fontSize: 11, color: "var(--ui-text-muted)", textAlign: "right" }}>{body.length}/500</div>
            {outcome && <div style={{ fontSize: 13, marginTop: 8 }} data-testid="contact-notify-outcome">{outcome}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" onClick={close} style={buttonStyle}>Close</button>
              <button type="button" onClick={() => void send()} disabled={busy || !body.trim()} data-testid="contact-notify-send"
                style={{ ...buttonStyle, background: busy || !body.trim() ? "var(--ui-surface-strong)" : "#0B1F3A", color: busy || !body.trim() ? "var(--ui-text-muted)" : "#fff" }}>
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
