import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope } from "@/api/crm";
import { logBiActivity, type CrmTarget } from "@/api/biCrmActivity"; // BF_PORTAL_v789_BI_ACTIVITY

// BF_PORTAL_v789_BI_ACTIVITY - outcomes a BI call log can carry.
export const CALL_OUTCOMES = ["connected", "left_voicemail", "no_answer", "busy", "wrong_number"] as const;

export function CallPopup({ scope, defaultPhone, onClose, onLogged, target = "bf" }: {
  scope: Scope; defaultPhone?: string; onClose: () => void; onLogged: () => void; target?: CrmTarget;
}): JSX.Element {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    setSaving(true); setErr(null);
    try {
      if (target === "bi") {
        await logBiActivity(scope, {
          event_type: "call",
          body: notes.trim(),
          outcome: outcome || null,
          meta: {
            direction,
            phone,
            duration_sec: duration ? Number.parseInt(duration, 10) : null,
          },
        });
        onLogged();
        onClose();
        return;
      }
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
        <input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone number" placeholder="+1 555 555 5555" style={popupInputStyle} />
      </div>
      {target === "bi" && (
        <select aria-label="Call outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} style={{ ...popupInputStyle, marginBottom: 8 }}>
          <option value="">Outcome (optional)</option>
          {CALL_OUTCOMES.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
        </select>
      )}
      <input
        value={duration}
        onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="Duration (seconds)"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <textarea spellCheck lang="en-CA" /* BF_PORTAL_SPELLCHECK_v54 */
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        aria-label="Call notes" placeholder="Call notes\u2026"
        style={popupInputStyle}
      />
      <p style={{ color: "var(--ui-text-muted)", fontSize: 12, marginTop: 8 }}>
        Use the slide-in dialer for live calls. This dialog logs a call you've already made.
      </p>
      {err && <div role="alert" style={{ color: "var(--ui-text-danger)", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
