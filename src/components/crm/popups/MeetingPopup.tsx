import { useState, type CSSProperties } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope } from "@/api/crm";

// BF_PORTAL_BLOCK_v336_MEETING_TYPE_v1
type MeetingType = "teams" | "phone" | "inperson";

const PUBLIC_BOOKINGS_URL = (import.meta.env.VITE_BOOKINGS_URL as string | undefined) ?? "";

export function MeetingPopup({ scope, onClose, onCreated, defaultPhone }: {
  scope: Scope; onClose: () => void; onCreated: () => void; defaultPhone?: string;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [description, setDescription] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  // BF_PORTAL_BLOCK_v336_MEETING_TYPE_v1 — Teams meeting vs phone call vs in person
  const [meetingType, setMeetingType] = useState<MeetingType>("teams");
  const [phone, setPhone] = useState(defaultPhone ?? "");

  async function copyBookingsLink(): Promise<void> {
    if (!PUBLIC_BOOKINGS_URL) {
      setErr("Bookings page URL is not configured. Set VITE_BOOKINGS_URL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(PUBLIC_BOOKINGS_URL);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", PUBLIC_BOOKINGS_URL);
    }
  }

  async function save(): Promise<void> {
    setSaving(true); setErr(null);
    try {
      await crmApi.meetings.create(scope, {
        title,
        start_at: start ? new Date(start).toISOString() : null,
        end_at: end ? new Date(end).toISOString() : null,
        location: meetingType === "phone"
          ? (phone.trim() ? `Phone call: ${phone.trim()}` : "")
          : meetingType === "inperson" ? location : "",
        meeting_type: meetingType,
        online: meetingType === "teams",
        attendees: attendees
          .split(",").map(a => a.trim()).filter(Boolean)
          .map(address => ({ address })),
        attendee_description: description,
        internal_note: internalNote,
        reminder_minutes: 60,
      });
      onCreated();
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not schedule the meeting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PopupShell
      title="Meeting"
      onClose={onClose}
      width={640}
      primaryAction={{
        label: saving ? "Scheduling…" : "Schedule",
        disabled: !title.trim() || !start || !end || saving,
        onClick: save,
      }}
    >
      <div style={bookingsBanner}>
        <div>
          <strong>Public bookings page</strong>
          <div style={{ fontSize: 12, color: "#516f90" }}>Send this link to clients to self-book a time.</div>
        </div>
        <button onClick={copyBookingsLink} style={copyBtn}>
          {linkCopied ? "✓ Copied" : "Copy link"}
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={popupInputStyle} />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={popupInputStyle} />
      </div>
      <input
        value={attendees}
        onChange={(e) => setAttendees(e.target.value)}
        placeholder="Attendees (comma-separated emails)"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      {/* BF_PORTAL_BLOCK_v336_MEETING_TYPE_v1 */}
      <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as MeetingType)} style={{ ...popupInputStyle, marginBottom: 8 }}>
        <option value="teams">Microsoft Teams meeting (auto link)</option>
        <option value="phone">Phone call (we call the client)</option>
        <option value="inperson">In person / other</option>
      </select>
      {meetingType === "teams" && (
        <div style={{ fontSize: 12, color: "#516f90", marginBottom: 8 }}>A Microsoft Teams join link is created automatically and included in the invite to attendees.</div>
      )}
      {meetingType === "phone" && (
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number to call" style={{ ...popupInputStyle, marginBottom: 8 }} />
      )}
      {meetingType === "inperson" && (
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location / address" style={{ ...popupInputStyle, marginBottom: 8 }} />
      )}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="Description for attendees…"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <textarea
        value={internalNote}
        onChange={(e) => setInternalNote(e.target.value)}
        rows={3}
        placeholder="Internal note (not sent to attendees)…"
        style={popupInputStyle}
      />
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}

const bookingsBanner: CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: 8, marginBottom: 12, background: "#f5f8fa", borderRadius: 4,
};
const copyBtn: CSSProperties = {
  background: "#0091ae", color: "#fff", border: "none",
  padding: "6px 12px", borderRadius: 4, cursor: "pointer",
};
