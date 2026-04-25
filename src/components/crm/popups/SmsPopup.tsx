import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { api } from "@/api";

export function SmsPopup({ contactId, defaultPhone, onClose, onSent }: {
  contactId: string; defaultPhone?: string; onClose: () => void; onSent: () => void;
}): JSX.Element {
  const [to, setTo] = useState(defaultPhone ?? "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(): Promise<void> {
    setSending(true); setErr(null);
    try {
      await api.post("/api/communications/sms", { contact_id: contactId, to, body });
      onSent();
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PopupShell
      title="SMS"
      onClose={onClose}
      primaryAction={{
        label: sending ? "Sending…" : "Send",
        disabled: !to || !body.trim() || sending,
        onClick: send,
      }}
    >
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="+15551234567"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="Message…"
        style={popupInputStyle}
      />
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
