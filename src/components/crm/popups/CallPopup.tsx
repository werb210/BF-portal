import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope } from "@/api/crm";

export function CallPopup({ scope, defaultPhone, onClose, onLogged }: {
  scope: Scope; defaultPhone?: string; onClose: () => void; onLogged: () => void;
}): JSX.Element {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    setSaving(true); setErr(null);
    try {
      const payload: Record<string, unknown> = {
        direction,
        duration_sec: duration ? Number.parseInt(duration, 10) : null,
        notes,
      };
      if (direction === "outbound") payload.to_number = phone;
      else payload.from_number = phone;
      await crmApi.calls.create(scope, payload);
      onLogged();
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not log the call.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PopupShell
      title="Log call"
      onClose={onClose}
      primaryAction={{ label: saving ? "Saving…" : "Log call", disabled: !phone || saving, onClick: save }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <select value={direction} onChange={(e) => setDirection(e.target.value as "outbound" | "inbound")} style={popupInputStyle}>
          <option value="outbound">Outbound</option>
          <option value="inbound">Inbound</option>
        </select>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 5555" style={popupInputStyle} />
      </div>
      <input
        value={duration}
        onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="Duration (seconds)"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Call notes…"
        style={popupInputStyle}
      />
      <p style={{ color: "#7c98b6", fontSize: 12, marginTop: 8 }}>
        Use the slide-in dialer for live calls. This dialog logs a call you've already made.
      </p>
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
