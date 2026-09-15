// BF_PORTAL_CALL_DISPOSITION_v204
// Records the outcome of a call from the Phone tab.
//
// Everything that follows from the choice - the follow-up task and the CRM
// timeline note - is done by the server in the same request
// (BF_SERVER_CALL_DISPOSITION_v145). Nothing is duplicated here, so the portal,
// the iOS dialer and the Watch all produce identical side effects.
import { useState } from "react";
import { api } from "@/api";

// Must match CALL_DISPOSITIONS in src/modules/calls/callDisposition.ts. The
// server returns unknown_disposition for anything else rather than guessing.
const OPTIONS: Array<{ value: string; label: string; creates?: string }> = [
  { value: "connected", label: "Connected" },
  { value: "left_voicemail", label: "Left voicemail" },
  { value: "no_answer", label: "No answer" },
  { value: "follow_up", label: "Follow-up required", creates: "task in 2 days" },
  { value: "documents_promised", label: "Documents promised", creates: "task in 3 days" },
  { value: "demo_booked", label: "Demo booked", creates: "task tomorrow" },
  { value: "needs_lender_review", label: "Needs lender review", creates: "task tomorrow" },
  { value: "not_interested", label: "Not interested" },
  { value: "do_not_contact", label: "Do not contact" },
];

type Props = {
  callId: string;
  current?: string | null;
  onSaved?: (disposition: string) => void;
};

export default function CallDispositionPicker({ callId, current, onSaved }: Props) {
  const [value, setValue] = useState<string>(current ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  async function save(next: string) {
    if (!next) return;
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const res = await api.post<{
        followUpCreated?: boolean;
        data?: { followUpCreated?: boolean };
      }>(
        `/api/telephony/calls/${encodeURIComponent(callId)}/disposition`,
        { disposition: next },
      );
      setValue(next);
      // Tell staff what the server actually did. A task appearing silently is
      // how people end up with duplicate follow-ups they did not expect.
      setSavedNote(
        res?.followUpCreated ?? res?.data?.followUpCreated
          ? "Saved — follow-up task created"
          : "Saved",
      );
      onSaved?.(next);
    } catch (e: any) {
      // call_not_found means the call was logged against another staff user;
      // that is a real condition, not a generic failure, so show the reason.
      const reason = e?.details?.error ?? e?.response?.data?.error ?? e?.message ?? "unknown";
      setError(`Could not save (${reason})`);
      setValue(current ?? "");
    } finally {
      setSaving(false);
    }
  }

  const chosen = OPTIONS.find((o) => o.value === value);

  return (
    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <select
        value={value}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        aria-label="Call outcome"
        style={{
          fontSize: 13, padding: "4px 8px", borderRadius: 6,
          border: "1px solid #d1d5db", background: "#fff", color: "#111827",
        }}
      >
        <option value="">Set outcome…</option>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.creates ? ` — creates a ${o.creates}` : ""}
          </option>
        ))}
      </select>
      {saving && <span style={{ fontSize: 12, color: "#6b7280" }}>Saving…</span>}
      {!saving && savedNote && <span style={{ fontSize: 12, color: "#15803d" }}>{savedNote}</span>}
      {!saving && !savedNote && chosen && current === value && (
        <span style={{ fontSize: 12, color: "#6b7280" }}>Recorded</span>
      )}
      {error && <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </div>
  );
}
