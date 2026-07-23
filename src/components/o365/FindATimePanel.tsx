// BF_PORTAL_O365_UI_v1 - find-a-time free/busy grid (GET /api/calendar/schedule).
// BF_PORTAL_FINDTIME_AUTOCOMPLETE_v1 - type a teammate's name or email to add them
// (suggestions from /api/tasks/staff) instead of typing full addresses by hand.
import { useEffect, useState } from "react";
import { api } from "@/api";

// BF_PORTAL_FINDTIME_GRID_v1 - Graph returns a per-entry `error` when a mailbox
// cannot be resolved; surface it instead of rendering a blank row.
type ScheduleEntry = {
  scheduleId?: string;
  availabilityView?: string;
  error?: { message?: string; responseCode?: string } | null;
};

// The grid is a local-day view: slot i covers 30 minutes from local midnight.
// Only working hours are drawn, so the row is readable rather than 48 anonymous ticks.
const SLOT_MINUTES = 30;
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 19;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const FIRST_SLOT = GRID_START_HOUR * SLOTS_PER_HOUR;
const LAST_SLOT = GRID_END_HOUR * SLOTS_PER_HOUR;
const SLOT_LABEL: Record<string, string> = { "0": "Free", "1": "Tentative", "2": "Busy", "3": "Out of office", "4": "Working elsewhere" };

function localDayWindow(): { start: string; end: string } {
  const now = new Date();
  const startD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endD = new Date(startD.getTime() + 24 * 60 * 60 * 1000);
  return { start: startD.toISOString(), end: endD.toISOString() };
}

function slotTimeLabel(slotIndex: number): string {
  const totalMinutes = slotIndex * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
type StaffMember = { id: string; name: string; email: string };

const SLOT_COLORS: Record<string, string> = {
  "0": "#22c55e",
  "1": "#fbbf24",
  "2": "#ef4444",
  "3": "#a855f7",
  "4": "#38bdf8",
};

// BF_PORTAL_FINDTIME_RULER_ALIGN_v1
// The hour ruler and the availability blocks are two separate flex rows that
// have to line up pixel for pixel. They were each hardcoding their own widths
// (ruler cell `SLOTS_PER_HOUR * 14`, block `14`, label gutter `150` written out
// twice), so any change to one silently desynchronised the other - and the
// ruler additionally carried `paddingLeft: 2` and a `borderLeft`, which under
// content-box sizing pushes every label right of the block it names.
//
// Worse for reading: a 28px hour cell cannot fit "10 AM", so every label wrapped
// onto two lines and the last one clipped mid-character. The result was a row of
// bare numbers above a row of stray AM/PMs, aligned to nothing.
//
// One source of truth for the geometry, compact single-character meridiem so a
// label always fits its own hour, and nowrap so it can never wrap again.
const SLOT_PX = 14;
const HOUR_PX = SLOTS_PER_HOUR * SLOT_PX;
const LABEL_GUTTER_PX = 150;

function hourRulerLabel(hour24: number): string {
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}${hour24 >= 12 ? "p" : "a"}`;
}

export default function FindATimePanel() {
  // BF_PORTAL_FINDTIME_CHECKBOX_v1 - pick teammates from a checkbox list of
  // staff instead of typing comma-separated addresses. Typing invited typos
  // (andrew@ vs andrew.p@) that Graph then failed to resolve.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);

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

  const toggle = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  };

  const run = async () => {
    const list = Array.from(selected);
    if (!list.length) { setNote("Select at least one teammate."); return; }
    setLoading(true);
    setNote(null);
    try {
      // BF_PORTAL_FINDTIME_SHOW_ERR_v1 - show the real reason (Graph error) instead of a blank "no availability".
      // BF_PORTAL_FINDTIME_UNWRAP_v1 - api.get() already unwraps the server's
      // {status,data} envelope (parsePayload returns json.data), so reading
      // r.data here was always undefined and every check reported "no
      // availability" even when Graph returned schedules. Accept both shapes.
      type SchedulePayload = { schedules?: ScheduleEntry[]; connected?: boolean; error?: string };
      // BF_PORTAL_FINDTIME_GRID_v1 - the server defaults to a UTC day, which in
      // western timezones starts the evening before. Send the viewer's own day.
      const win = localDayWindow();
      const r = await api.get<SchedulePayload & { data?: SchedulePayload }>(
        `/api/calendar/schedule?emails=${encodeURIComponent(list.join(","))}`
          + `&start=${encodeURIComponent(win.start)}&end=${encodeURIComponent(win.end)}`
      );
      const data: SchedulePayload = (r && typeof r === "object" && r.data ? r.data : r) ?? {};
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
      <p style={{ color: "var(--ui-text-muted)", fontSize: 12, marginTop: 0 }}>Select teammates to see today&apos;s free/busy.</p>
      {/* BF_PORTAL_FINDTIME_CHECKBOX_v1 - staff checkbox list (Admin/Marketing/Staff only, server-filtered). */}
      <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--ui-border, #eaf0f6)", borderRadius: 6, padding: 8, marginBottom: 10 }}>
        {staff.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No staff found.</div>
        ) : (
          staff.map((m) => (
            <label
              key={m.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", fontSize: 13, cursor: "pointer" }}
              title={m.email}
            >
              <input type="checkbox" checked={selected.has(m.email)} onChange={() => toggle(m.email)} />
              <span style={{ fontWeight: 600 }}>{m.name}</span>
              <span style={{ color: "var(--ui-text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</span>
            </label>
          ))
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => void run()} disabled={loading || selected.size === 0} style={{ padding: "6px 14px", background: selected.size === 0 ? "var(--ui-surface-muted)" : "var(--ui-accent-blue)", color: selected.size === 0 ? "var(--ui-text-muted)" : "#fff", border: "none", borderRadius: 4, cursor: selected.size === 0 ? "default" : "pointer" }}>
          {loading ? "Checking..." : "Check"}
        </button>
        {selected.size > 0 && (
          <button type="button" onClick={() => { setSelected(new Set()); setRows([]); setNote(null); }} style={{ padding: "6px 10px", background: "transparent", color: "var(--ui-text-muted)", border: "1px solid var(--ui-border, #cbd6e2)", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{selected.size} selected</span>
      </div>
      {note && <p style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{note}</p>}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* BF_PORTAL_FINDTIME_RULER_ALIGN_v1 - hour ruler, sharing SLOT_PX /
              HOUR_PX / LABEL_GUTTER_PX with the block rows below so the two can
              never drift. boxSizing is set explicitly rather than inherited: the
              cell must measure exactly one hour INCLUDING its divider line, or
              every label creeps right of the hour it names. */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 0, paddingLeft: LABEL_GUTTER_PX }}>
            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, h) => (
              <div
                key={`hr-${h}`}
                style={{
                  width: HOUR_PX,
                  minWidth: HOUR_PX,
                  maxWidth: HOUR_PX,
                  boxSizing: "border-box",
                  flex: `0 0 ${HOUR_PX}px`,
                  fontSize: 10,
                  lineHeight: "12px",
                  color: "var(--ui-text-muted)",
                  borderLeft: "1px solid var(--ui-border, #eaf0f6)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textAlign: "left",
                  paddingLeft: 2,
                }}
                title={slotTimeLabel((GRID_START_HOUR + h) * SLOTS_PER_HOUR)}
              >
                {hourRulerLabel(GRID_START_HOUR + h)}
              </div>
            ))}
          </div>
          {rows.map((row, idx) => {
            const view = row.availabilityView ?? "";
            const slots = Array.from(view);
            const label = row.scheduleId && row.scheduleId.trim() ? row.scheduleId : "Unknown mailbox";
            const errMsg = row.error?.message ?? null;
            return (
              <div key={row.scheduleId ?? `row-${idx}`} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ width: LABEL_GUTTER_PX, minWidth: LABEL_GUTTER_PX, boxSizing: "border-box", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>{label}</div>
                {errMsg || slots.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
                    {errMsg ? `Could not read this calendar - ${errMsg}` : "No free/busy published for this mailbox."}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 0 }}>
                    {slots.slice(FIRST_SLOT, LAST_SLOT).map((ch, i) => {
                      const slotIndex = FIRST_SLOT + i;
                      const code = ch ?? "0";
                      return (
                        <span
                          key={`${idx}-${slotIndex}`}
                          title={`${slotTimeLabel(slotIndex)} - ${SLOT_LABEL[code] ?? "Unknown"}`}
                          style={{
                            width: SLOT_PX,
                            minWidth: SLOT_PX,
                            boxSizing: "border-box",
                            flex: `0 0 ${SLOT_PX}px`,
                            height: 22,
                            background: SLOT_COLORS[code] ?? "#e2e8f0",
                            borderLeft: slotIndex % SLOTS_PER_HOUR === 0 ? "1px solid var(--ui-border, #cbd6e2)" : "none"
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ui-text-muted)", marginTop: 4 }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#22c55e", marginRight: 3 }} />Free</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#fbbf24", marginRight: 3 }} />Tentative</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#ef4444", marginRight: 3 }} />Busy</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#a855f7", marginRight: 3 }} />Out of office</span>
            {/* BF_PORTAL_FINDTIME_RULER_ALIGN_v1 - SLOT_COLORS renders five states
                but the legend only explained four, so a "working elsewhere" block
                appeared as an unexplained colour. */}
            <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#38bdf8", marginRight: 3 }} />Working elsewhere</span>
            <span style={{ marginLeft: "auto" }}>Today, {GRID_START_HOUR}:00 - {GRID_END_HOUR}:00 local</span>
          </div>
        </div>
      )}
    </div>
  );
}
