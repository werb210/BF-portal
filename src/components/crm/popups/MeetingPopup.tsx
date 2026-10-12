import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope } from "@/api/crm";
// BF_PORTAL_MEETING_DATETIME_PICKER_v1 - same picker as TaskModal.
import DateTimePicker from "@/components/ui/DateTimePicker";
import { api } from "@/api"; // BF_PORTAL_MEETING_CONFERENCE_v745
import { describeMeetingDelivery, type MeetingDelivery } from "@/pages/calendar/MeetingRoomsPanel";
// BF_PORTAL_v786_CRM_FIXES - attendees are picked by name or email instead of typed blind.
import PeoplePicker, { type Person } from "@/components/meetings/PeoplePicker";
import { RecipientAutocomplete } from "@/components/communications/RecipientAutocomplete";
import { logBiActivity, type CrmTarget } from "@/api/biCrmActivity"; // BF_PORTAL_v789_BI_ACTIVITY

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
// BF_PORTAL_v789_BI_ACTIVITY - target "bi" logs the meeting to BI-Server only: no BF-Server calendar
// event, conference room or contact lookup, so the conference option and the autocomplete are hidden.
export function MeetingPopup({ scope, onClose, onCreated, defaultPhone, defaultEmail, defaultName, target = "bf" }: {
  scope: Scope; onClose: () => void; onCreated: () => void; defaultPhone?: string; defaultEmail?: string; defaultName?: string; target?: CrmTarget;
}): JSX.Element {
  const isBi = target === "bi";
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
  const contactId = scope.kind === "contact" ? scope.id : undefined;
  // BF_PORTAL_v786_CRM_FIXES - conference attendees, pre-filled with the contact.
  const [people, setPeople] = useState<Person[]>(() => defaultEmail || defaultName
    ? [{ contactId: contactId ?? null, name: defaultName || defaultEmail || "", email: defaultEmail ?? null, phone: defaultPhone ?? null, kind: "contact" }]
    : []);

  // BF_PORTAL_MEETING_CONFERENCE_v745 - create the room through /api/meetings (the same call the Calendar's
  // Conference rooms panel makes): Outlook event, emailed and texted invites, a 6-digit access code.
  async function saveConference(): Promise<void> {
    const contactEmail = (defaultEmail ?? "").trim().toLowerCase();
    const participants = people.map((p) => {
      const isContact = (!!contactId && p.contactId === contactId) || (!!contactEmail && (p.email ?? "").toLowerCase() === contactEmail);
      return {
        contactId: isContact ? contactId : (p.contactId ?? undefined),
        userId: p.userId ?? undefined,
        name: p.name || p.email || "",
        email: p.email ?? null,
        phone: isContact ? (phone.trim() || p.phone || null) : (p.phone ?? null),
      };
    });
    const r = await api.post<{ meeting: { code: string }; refused?: number; delivery?: MeetingDelivery }>("/api/meetings", {
      title, startsAt: new Date(start).toISOString(), durationMin: roomMinutes(start, end), participants,
      ...(contactId ? { contactId } : {}),
    });
    const told = describeMeetingDelivery(r.delivery);
    setRoomResult({ ok: told.ok, text: "Conference room booked. Access code " + r.meeting.code + ". Callers dial (866) 631-8939, press 3 and enter the code. " + told.text + (r.refused ? " " + r.refused + " not added - a room holds 10 people." : "") });
    onCreated();
  }

  async function save(): Promise<void> {
    setSaving(true); setErr(null);
    try {
      if (isBi) {
        await logBiActivity(scope, {
          event_type: "meeting",
          body: description.trim() || title.trim(),
          meta: {
            title: title.trim(),
            start_at: start ? new Date(start).toISOString() : null,
            end_at: end ? new Date(end).toISOString() : null,
            meeting_type: meetingType,
            location: meetingType === "phone" ? phone.trim() : meetingType === "inperson" ? location : "",
            attendees: attendees.split(",").map((a) => a.trim()).filter(Boolean),
            internal_note: internalNote,
          },
        });
        onCreated();
        onClose();
        return;
      }
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
      title={isBi ? "Log meeting" : "Meeting"}
      onClose={onClose}
      width={640}
      primaryAction={roomResult ? { label: "Done", disabled: false, onClick: onClose } : {
        label: saving ? (isBi ? "Saving..." : "Scheduling\u2026") : isBi ? "Log meeting" : "Schedule",
        disabled: !title.trim() || !start || (!end && !isBi) || saving,
        onClick: save,
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Meeting title"
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
      {/* BF_PORTAL_v786_CRM_FIXES - name/email autosuggest for attendees */}
      {isBi ? (
        <input
          data-testid="meeting-attendees"
          aria-label="Attendees"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          placeholder="Attendees - emails, comma separated"
          style={{ ...popupInputStyle, marginBottom: 8 }}
        />
      ) : meetingType === "conference" ? (
        <div style={{ marginBottom: 8 }}><PeoplePicker value={people} onChange={setPeople} /></div>
      ) : (
        <div data-testid="meeting-attendees" style={{ marginBottom: 8 }}>
          <RecipientAutocomplete
            value={attendees}
            onChange={setAttendees}
            placeholder="Attendees - type a name or email"
            style={popupInputStyle}
          />
        </div>
      )}
      <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as MeetingType)} style={{ ...popupInputStyle, marginBottom: 8 }}>
        <option value="teams">Microsoft Teams meeting (auto link)</option>
        <option value="phone">Phone call (we call the client)</option>
        {!isBi && <option value="conference">Conference call (dial-in code, up to 10 people)</option>}
        <option value="inperson">In person / other</option>
      </select>
      {meetingType === "teams" && !isBi && (
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 8 }}>A Microsoft Teams join link is created automatically and included in the invite to attendees.</div>
      )}
      {meetingType === "phone" && (
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number to call" style={{ ...popupInputStyle, marginBottom: 8 }} />
      )}
      {meetingType === "conference" && (
        <>
          <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 8 }}>Books a Boreal conference room. Everyone dials (866) 631-8939, presses 3 and enters the access code. Attendees get the invite by email, and by text when a phone number is known.</div>
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
        aria-label="Meeting description"
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
      {err && <div role="alert" style={{ color: "var(--ui-text-danger)", marginTop: 8 }}>{err}</div>}
      {roomResult && <div role="status" data-testid="meeting-room-result" style={{ marginTop: 8, fontWeight: 600, color: roomResult.ok ? "#065f46" : "#991b1b" }}>{roomResult.text}</div>}
    </PopupShell>
  );
}
