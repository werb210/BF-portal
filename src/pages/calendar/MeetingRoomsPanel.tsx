// BF_PORTAL_MEETING_ROOMS_v736 - conference rooms with access codes. Staff schedule a room,
// get a 6-digit code and a meeting link, and copy the invite for clients and lenders. Everyone
// (staff included) joins by calling (866) 631-8939, pressing 3 and entering the code.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import PeoplePicker, { type Person } from "@/components/meetings/PeoplePicker"; // BF_PORTAL_MEETING_PARTICIPANTS_v737

export type Meeting = { id: string; code: string; title: string; starts_at: string; duration_min: number; joinUrl: string; oneTap: string; invite: string; open: boolean };
const NAVY = "#0B1F3A", MUTED = "#51617D";

// BF_PORTAL_MEETING_NOTIFY_v741 - say exactly what went out: the Outlook event, texts, emails, and anything that failed.
export type MeetingDelivery = { calendar: "created" | "updated" | "cancelled" | "skipped" | "failed"; calendarError: string | null; emailed: number; texted: number; errors: string[] };
export function describeMeetingDelivery(d: MeetingDelivery | null | undefined): { ok: boolean; text: string } {
  if (!d) return { ok: true, text: "" };
  const parts: string[] = [];
  if (d.calendar === "created") parts.push("Added to your Outlook calendar" + (d.emailed ? " and calendar invitations sent to " + d.emailed + (d.emailed === 1 ? " person" : " people") : ""));
  else if (d.calendar === "updated") parts.push("Outlook event updated" + (d.emailed ? ", invitations sent to " + d.emailed + " new " + (d.emailed === 1 ? "person" : "people") : ""));
  else if (d.calendar === "cancelled") parts.push("Outlook event cancelled - attendees are notified");
  else if (d.emailed) parts.push("Invite emailed to " + d.emailed + (d.emailed === 1 ? " person" : " people"));
  if (d.texted) parts.push("texted " + d.texted + (d.texted === 1 ? " person" : " people"));
  const problems = d.errors.length ? " Problems: " + d.errors.join("; ") + "." : "";
  return { ok: d.errors.length === 0, text: (parts.length ? parts.join(", ") + "." : "Nothing was sent.") + problems };
}

// BF_PORTAL_MEETING_PARTICIPANTS_v737 - people are added by name search (up to 10 including
// you); they are emailed the invite. From a CRM contact the contact is already filled in.
export default function MeetingRoomsPanel({ initialPeople = [], defaultTitle = "", hideList = false }: { initialPeople?: Person[]; defaultTitle?: string; hideList?: boolean }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [title, setTitle] = useState(defaultTitle);
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true); // BF_PORTAL_MEETING_NOTIFY_v741
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<{ meetings?: Meeting[] }>("/api/meetings").then((r) => setMeetings(Array.isArray(r?.meetings) ? r.meetings : [])).catch(() => setMeetings([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!title.trim() || !when) { setMsg("Add a title and a start time."); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ meeting: Meeting; invited?: number; refused?: number; delivery?: MeetingDelivery; duplicate?: boolean }>("/api/meetings", { title: title.trim(), startsAt: new Date(when).toISOString(), durationMin: minutes, participants: people.map(({ contactId, userId, name, email, phone }) => ({ contactId, userId, name, email, phone })) });
      setTitle(""); setWhen(""); setPeople([]);
      // BF_PORTAL_NO_DUPLICATE_ROOMS_v751 - pressing Create again (e.g. after a slow "Could not create" answer) returns
      // the room already made; say so instead of announcing a new meeting.
      if (r.duplicate) { setMsgOk(true); setMsg("This meeting was already created - access code " + r.meeting.code + ". No second room was made."); load(); return; }
      const told = describeMeetingDelivery(r.delivery);
      setMsgOk(told.ok);
      setMsg("Meeting created. Access code " + r.meeting.code + ". " + told.text + (r.refused ? " " + r.refused + " not added - a room holds 10 people." : ""));
      load();
    } catch { setMsgOk(false); setMsg("Could not create the meeting. Please try again."); }
    finally { setBusy(false); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setMsg("Invite copied."); } catch { setMsg("Copy failed - select the text and copy it."); } };
  const cancel = async (m: Meeting) => {
    if (!window.confirm("Cancel " + m.title + "? The access code stops working.")) return;
    try { const r = await api.post<{ delivery?: MeetingDelivery | null }>("/api/meetings/" + encodeURIComponent(m.id) + "/cancel", {}); const told = describeMeetingDelivery(r?.delivery); setMsgOk(told.ok); setMsg("Meeting cancelled. " + told.text); load(); } catch { setMsgOk(false); setMsg("Could not cancel the meeting."); }
  };

  const input = { padding: "8px 10px", border: "1px solid #E4EAF2", borderRadius: 8, color: NAVY, background: "#fff" } as const;
  return (
    <section data-testid="meeting-rooms" style={{ background: "#fff", color: NAVY, border: "1px solid #E4EAF2", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Conference rooms</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: MUTED }}>Callers dial (866) 631-8939, press 3 and enter the access code. The room opens 15 minutes before the start.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input aria-label="Meeting title" placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...input, minWidth: 220 }} />
        <input aria-label="Start time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={input} />
        <select aria-label="Length" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={input}>
          {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
        <button type="button" className="ui-button ui-button--primary" disabled={busy} onClick={() => void create()}>{busy ? "Creating..." : "Create meeting"}</button>
      </div>
      <div style={{ marginTop: 10 }}><PeoplePicker value={people} onChange={setPeople} /></div>
      {msg && <p role="status" style={{ fontSize: 13, margin: "8px 0 0", color: msgOk ? "#065f46" : "#991b1b", fontWeight: 600 }}>{msg}</p>}
      {!hideList && <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {!meetings.length && <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No upcoming meetings.</p>}
        {meetings.map((m) => (
          <div key={m.id} data-testid="meeting-row" style={{ border: "1px solid #E4EAF2", borderRadius: 8, padding: 10, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <strong>{m.title}</strong>{m.open && <span style={{ marginLeft: 8, fontSize: 12, color: "#065f46", fontWeight: 600 }}>Open now</span>}
              <div style={{ fontSize: 13, color: MUTED }}>{new Date(m.starts_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })} - {m.duration_min} min - code <strong style={{ color: NAVY, letterSpacing: 1 }}>{m.code}</strong></div>
            </div>
            <button type="button" className="ui-button ui-button--secondary" onClick={() => void copy(m.invite)}>Copy invite</button>
            <a className="ui-button ui-button--secondary" href={m.joinUrl} target="_blank" rel="noreferrer">Meeting page</a>
            <a className="ui-button ui-button--secondary" href={"tel:" + m.oneTap}>Join by phone</a>
            <button type="button" className="ui-button ui-button--secondary" onClick={() => void cancel(m)}>Cancel</button>
          </div>
        ))}
      </div>}
    </section>
  );
}
