import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope } from "@/api/crm";
// BF_PORTAL_MEETING_DATETIME_PICKER_v1 - same picker as TaskModal.
import DateTimePicker from "@/components/ui/DateTimePicker";
import { api } from "@/api"; // BF_PORTAL_MEETING_CONFERENCE_v745
import { describeMeetingDelivery, type MeetingDelivery } from "@/pages/calendar/MeetingRoomsPanel";

// BF_PORTAL_BLOCK_v336_MEETING_TYPE_v1
// BF_PORTAL_MEETING_CONFERENCE_v745 - "conference" books a Boreal conference room (dial-in code) from the same form.
type MeetingType = "teams" | "phone" | "conference" | "inperson";
/** Minutes between two ISO times, kept to what a conference room allows (15 to 240). */
export function roomMinutes(startIso: string, endIso: string): number {
  const m = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  return Number.isFinite(m) ? Math.min(240, Math.max(15, m)) : 60;
}

// BF_PORTAL_MEETING_NO_PUBLIC_BOOKING_v1 — public self-book banner removed;
// the contact's email is pre-filled as an attendee so the invite is sent.
export function MeetingPopup({ scope, onClose, onCreated, defaultPhone, defaultEmail, defaultName }: {
  scope: Scope; onClose: () => void; onCreated: () => void; defaultPhone?: string; defaultEmail?: string; defaultName?: string;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState(defaultEmail ?? "");
  const [description, setDescription] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType>("teams");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [roomResult, setRoomResult] = useState<{ ok: boolean; text: string } | null>(null); // BF_PORTAL_MEETING_CONFERENCE_v745

  // BF_PORTAL_MEETING_CONFERENCE_v745 - create the room through /api/meetings (the same call the Calendar's
  // Conference rooms panel makes): Outlook event, emailed and texted invites, a 6-digit access code.
  async function saveConference(): Promise<void> {
    const emails = attendees.split(",").map((a) => a.trim()).filter(Boolean);
    const contactEmail = (defaultEmail ?? "").trim().toLowerCase();
    const participants = emails.map((email) => {
      const isContact = !!contactEmail && email.toLowerCase() === contactEmail;
      return {
        contactId: isContact && scope.kind === "contact" ? scope.id : undefined,
        name: isContact && defaultName ? defaultName : email,
        email,
        phone: isContact ? (phone.trim() || null) : null,
      };
    });
    const r = await api.post<{ meeting: { code: string }; refused?: number; delivery?: MeetingDelivery }>("/api/meetings", {
      title, startsAt: new Date(start).toISOString(), durationMin: roomMinutes(start, end), participants,
    });
    const told = describeMeetingDelivery(r.delivery);
    setRoomResult({ ok: told.ok, text: "Conference room booked. Access code " + r.meeting.code + ". Callers dial (866) 631-8939, press 3 and enter the code. " + told.text + (r.refused ? " " + r.refused + " not added - a room holds 10 people." : "") });
    onCreated();
  }

  async function save(): Promise<void> {
    setSaving(true); setErr(null);
    try {
      if (meetingType === "conference") { await saveConference(); return; }
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
      primaryAction={roomResult ? { label: "Done", disabled: false, onClick: onClose } : {
        label: saving ? "Scheduling…" : "Schedule",
        disabled: !title.trim() || !start || !end || saving,
        onClick: save,
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      {/* BF_PORTAL_MEETING_DATETIME_PICKER_v1 - the two raw datetime-local inputs
          rendered a bare "yyyy-mm-dd, --:-- --" box that did not match the Task
          popup. Both now use the shared calendar + time-list picker. Values are
          ISO strings, which is what save() already sends. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 3 }}>Starts</span>
          <DateTimePicker value={start} onChange={setStart} />
        </label>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 3 }}>Ends</span>
          <DateTimePicker value={end} onChange={setEnd} />
        </label>
      </div>
      <input
        value={attendees}
        onChange={(e) => setAttendees(e.target.value)}
        placeholder="Attendees (comma-separated emails)"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as MeetingType)} style={{ ...popupInputStyle, marginBottom: 8 }}>
        <option value="teams">Microsoft Teams meeting (auto link)</option>
        <option value="phone">Phone call (we call the client)</option>
        <option value="conference">Conference call (dial-in code, up to 10 people)</option>
        <option value="inperson">In person / other</option>
      </select>
      {meetingType === "teams" && (
        <div style={{ fontSize: 12, color: "#516f90", marginBottom: 8 }}>A Microsoft Teams join link is created automatically and included in the invite to attendees.</div>
      )}
      {meetingType === "phone" && (
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number to call" style={{ ...popupInputStyle, marginBottom: 8 }} />
      )}
      {meetingType === "conference" && (
        <>
          <div style={{ fontSize: 12, color: "#334e68", marginBottom: 8 }}>Books a Boreal conference room. Everyone dials (866) 631-8939, presses 3 and enters the access code. Attendees get the invite by email, and by text when a phone number is known.</div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Client's mobile for the text invite (optional)" style={{ ...popupInputStyle, marginBottom: 8 }} />
        </>
      )}
      {meetingType === "inperson" && (
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location / address" style={{ ...popupInputStyle, marginBottom: 8 }} />
      )}
      <textarea spellCheck lang="en-CA" /* BF_PORTAL_SPELLCHECK_v54 */
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="Description for attendees…"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <textarea spellCheck lang="en-CA" /* BF_PORTAL_SPELLCHECK_v54 */
        value={internalNote}
        onChange={(e) => setInternalNote(e.target.value)}
        rows={3}
        placeholder="Internal note (not sent to attendees)…"
        style={popupInputStyle}
      />
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
      {roomResult && <div role="status" data-testid="meeting-room-result" style={{ marginTop: 8, fontWeight: 600, color: roomResult.ok ? "#065f46" : "#991b1b" }}>{roomResult.text}</div>}
    </PopupShell>
  );
}
