// BF_PORTAL_MEETING_ROOMS_v736 - conference rooms with access codes. Staff schedule a room,
// get a 6-digit code and a meeting link, and copy the invite for clients and lenders. Everyone
// (staff included) joins by calling (866) 631-8939, pressing 3 and entering the code.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

export type Meeting = { id: string; code: string; title: string; starts_at: string; duration_min: number; joinUrl: string; oneTap: string; invite: string; open: boolean };
const NAVY = "#0B1F3A", MUTED = "#51617D";

export default function MeetingRoomsPanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<{ meetings?: Meeting[] }>("/api/meetings").then((r) => setMeetings(Array.isArray(r?.meetings) ? r.meetings : [])).catch(() => setMeetings([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!title.trim() || !when) { setMsg("Add a title and a start time."); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ meeting: Meeting }>("/api/meetings", { title: title.trim(), startsAt: new Date(when).toISOString(), durationMin: minutes });
      setTitle(""); setWhen("");
      setMsg("Meeting created. Access code " + r.meeting.code + " - copy the invite below.");
      load();
    } catch { setMsg("Could not create the meeting. Please try again."); }
    finally { setBusy(false); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setMsg("Invite copied."); } catch { setMsg("Copy failed - select the text and copy it."); } };
  const cancel = async (m: Meeting) => {
    if (!window.confirm("Cancel " + m.title + "? The access code stops working.")) return;
    try { await api.post("/api/meetings/" + encodeURIComponent(m.id) + "/cancel", {}); load(); } catch { setMsg("Could not cancel the meeting."); }
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
      {msg && <p role="status" style={{ fontSize: 13, margin: "8px 0 0" }}>{msg}</p>}
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
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
      </div>
    </section>
  );
}
