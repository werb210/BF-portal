// BF_PORTAL_O365_UI_v1 - find-a-time free/busy grid (GET /api/calendar/schedule).
// BF_PORTAL_FINDTIME_AUTOCOMPLETE_v1 - type a teammate's name or email to add them
// (suggestions from /api/tasks/staff) instead of typing full addresses by hand.
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

type ScheduleEntry = { scheduleId?: string; availabilityView?: string };
type StaffMember = { id: string; name: string; email: string };

const SLOT_COLORS: Record<string, string> = {
  "0": "#22c55e",
  "1": "#fbbf24",
  "2": "#ef4444",
  "3": "#a855f7",
  "4": "#38bdf8",
};

export default function FindATimePanel() {
  const [emails, setEmails] = useState("");
  const [rows, setRows] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showSug, setShowSug] = useState(false);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<unknown>("/api/tasks/staff")
      .then((r) => {
        if (!alive) return;
        const body = ((r as { data?: unknown })?.data ?? r) as { staff?: Array<{ id: string; name: string; email?: string }> };
        setStaff(
          (body?.staff ?? [])
            .filter((s) => !!s.email)
            .map((s) => ({ id: s.id, name: s.name, email: s.email as string }))
        );
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const parts = emails.split(",");
  const currentToken = (parts[parts.length - 1] ?? "").trim().toLowerCase();
  const chosen = new Set(parts.slice(0, -1).map((p) => p.trim().toLowerCase()).filter(Boolean));
  const suggestions = staff
    .filter((s) => !chosen.has(s.email.toLowerCase()))
    .filter((s) => currentToken === "" || s.name.toLowerCase().includes(currentToken) || s.email.toLowerCase().includes(currentToken))
    .slice(0, 8);

  const pick = (email: string) => {
    const head = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
    head.push(email);
    setEmails(head.join(", ") + ", ");
    setShowSug(false);
  };

  const run = async () => {
    const list = emails.split(",").map((e) => e.trim()).filter(Boolean);
    if (!list.length) return;
    setLoading(true);
    setNote(null);
    try {
      // BF_PORTAL_FINDTIME_SHOW_ERR_v1 - show the real reason (Graph error) instead of a blank "no availability".
      const r = await api.get<{ data?: { schedules?: ScheduleEntry[]; connected?: boolean; error?: string } }>(
        `/api/calendar/schedule?emails=${encodeURIComponent(list.join(","))}`
      );
      const data = r.data ?? {};
      const schedules = Array.isArray(data.schedules) ? data.schedules : [];
      setRows(schedules);
      if (data.connected === false) setNote("Connect Microsoft 365 in Settings to check availability.");
      else if (data.error) setNote(`Availability check failed - ${data.error}`);
      else if (schedules.length === 0) setNote("No availability returned for those addresses.");
    } catch {
      setNote("Could not fetch availability.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, border: "1px solid var(--ui-border, #eaf0f6)", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0, fontSize: 15 }}>Find a time</h3>
      <p style={{ color: "var(--ui-text-muted)", fontSize: 12, marginTop: 0 }}>Start typing a teammate&apos;s name or email to add them, then see today&apos;s free/busy.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            value={emails}
            onChange={(e) => { setEmails(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => { blurTimer.current = window.setTimeout(() => setShowSug(false), 150); }}
            onKeyDown={(e) => { if (e.key === "Enter") { setShowSug(false); void run(); } }}
            placeholder="Start typing a name, e.g. Andrew"
            style={{ width: "100%", padding: "6px 10px", borderRadius: 4, border: "1px solid #cbd6e2", boxSizing: "border-box" }}
          />
          {showSug && suggestions.length > 0 && (
            <div
              onMouseDown={() => { if (blurTimer.current) window.clearTimeout(blurTimer.current); }}
              style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "var(--ui-surface, #fff)", border: "1px solid #cbd6e2", borderRadius: 4, marginTop: 2, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.email)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13 }}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: "var(--ui-text-muted)", marginLeft: 6 }}>{s.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => void run()} disabled={loading} style={{ padding: "6px 14px", background: "var(--ui-accent-blue)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          {loading ? "Checking..." : "Check"}
        </button>
      </div>
      {note && <p style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{note}</p>}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, idx) => {
            const view = row.availabilityView ?? "";
            return (
              <div key={row.scheduleId ?? `row-${idx}`}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{row.scheduleId ?? "Unknown"}</div>
                <div style={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {view.split("").map((ch, i) => (
                    <span key={`${idx}-${i}`} title={`Slot ${i + 1}`} style={{ width: 8, height: 16, background: SLOT_COLORS[ch] ?? "#e2e8f0", borderRadius: 1 }} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ui-text-muted)", marginTop: 4 }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#22c55e", marginRight: 3 }} />Free</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#fbbf24", marginRight: 3 }} />Tentative</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#ef4444", marginRight: 3 }} />Busy</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#a855f7", marginRight: 3 }} />Out of office</span>
          </div>
        </div>
      )}
    </div>
  );
}
