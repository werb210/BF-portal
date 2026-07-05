import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import RequireRole from "@/components/auth/RequireRole";
import SecondaryButton from "@/components/forms/SecondaryButton";
import CalendarTasksPanel from "./CalendarTasksPanel";

type ApiCalendarEvent = {
  id?: string;
  title?: string;
  start?: string;
  end?: string;
  attendees?: string[] | string;
  location?: string;
  teams_link?: string;
  teamsLink?: string;
  notes?: string;
};

type StaffUser = { id: string; name?: string | null; email?: string | null; first_name?: string | null; last_name?: string | null };

type CalendarTask = {
  id?: string;
  title?: string;
  due_date?: string;
  dueDate?: string;
  dueAt?: string | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  assignee_id?: string | null;
  assigneeId?: string | null;
  assignee_name?: string | null;
  assigneeName?: string | null;
  assignee_email?: string | null;
  assigneeEmail?: string | null;
  completed?: boolean;
  completedAt?: string | null;
  status?: "open" | "done";
  priority?: "low" | "normal" | "high";
  notes?: string | null;
};

type CalendarEvent = {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: ApiCalendarEvent & { source?: "calendar" | "task"; taskId?: string; taskState?: "overdue" | "dueToday" | "upcoming" };
};

// BF_PORTAL_CALENDAR_TZ_FIX_v1 - a <input type="datetime-local"> yields a naive local
// wall-clock string (e.g. "2026-06-29T14:00") with no timezone. The server stamps it as
// timeZone:"UTC" and the grid re-reads it as UTC, so 2 PM local was stored and shown as
// 8 AM. Convert the local value to a true UTC ISO instant before POSTing so the stored
// time matches what the user picked. Empty/invalid values pass through unchanged.
const localInputToUtcIso = (v: string): string => {
  if (!v) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toISOString();
};

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

function groupTasks(tasks: CalendarTask[]) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const grouped = {
    overdue: [] as CalendarTask[],
    dueToday: [] as CalendarTask[],
    upcoming: [] as CalendarTask[],
    noDueDate: [] as CalendarTask[],
    // BF_PORTAL_BLOCK_v610_CALENDAR_FIXES_v1
    completed: [] as CalendarTask[],
  };

  // BF_PORTAL_BLOCK_v610_CALENDAR_FIXES_v1 — completed tasks were staying in
  // Overdue (and the calendar grid) forever because the grouper ignored
  // status/completedAt. Now done-tasks route into a Completed bucket instead.
  tasks.forEach((task) => {
    const isDone = task.status === "done" || Boolean(task.completedAt) || Boolean(task.completed);
    if (isDone) {
      grouped.completed.push(task);
      return;
    }
    const due = task.due_date ?? task.dueAt ?? task.dueDate;
    if (!due) {
      grouped.noDueDate.push(task);
      return;
    }

    const dueDate = new Date(due);
    if (Number.isNaN(dueDate.getTime())) {
      grouped.noDueDate.push(task);
      return;
    }

    if (dueDate < start) grouped.overdue.push(task);
    else if (dueDate >= start && dueDate < end) grouped.dueToday.push(task);
    else grouped.upcoming.push(task);
  });

  return grouped;
}

function CalendarContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // BF_PORTAL_BLOCK_v624_COMMS_AND_CALENDAR_v1 — Calendar config locked to
  // Todd's spec: Day default, 7am–8pm visible hours, Week shows Mon–Fri
  // only (Work week), no mini month picker, tasks do NOT render on the
  // grid (they live in the right-side panel only — calendar and tasks are
  // separate per Todd's #14).
  // BF_PORTAL_BLOCK_v626_COMMS_REALTIME_v1 — 'year' is a custom view
  // outside react-big-calendar; rendered separately below.
  const [view, setView] = useState<View | "year">("day");
  const minTime = useMemo(() => { const d = new Date(); d.setHours(7, 0, 0, 0); return d; }, []);
  const maxTime = useMemo(() => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; }, []);
  // BF_PORTAL_BLOCK_v610_CALENDAR_FIXES_v1 — mirror RBC's internal date so the
  // explicit month/year header updates when staff clicks Back/Next.
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", start: "", end: "", attendees: "", location: "", notes: "" });
  const queryClient = useQueryClient();

  // BF_PORTAL_BLOCK_v699_CALENDAR_RANGE_v1 — send the visible window to the
  // server as ?start/?end so navigating weeks/months loads that range. The
  // server otherwise defaults to ~now-7d..now+60d (BF_SERVER_BLOCK_v685).
  const calRange = useMemo(() => {
    const d = currentDate;
    const DAY = 86400000;
    let start: Date;
    let end: Date;
    if (view === "year") {
      start = new Date(d.getFullYear(), 0, 1);
      end = new Date(d.getFullYear() + 1, 0, 1);
    } else if (view === "month") {
      start = new Date(d.getFullYear(), d.getMonth(), 1 - 7);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 1 + 7);
    } else if (view === "week" || view === "work_week") {
      start = new Date(d.getTime() - 10 * DAY);
      end = new Date(d.getTime() + 10 * DAY);
    } else {
      start = new Date(d.getTime() - 2 * DAY);
      end = new Date(d.getTime() + 3 * DAY);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [currentDate, view]);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", calRange.start, calRange.end],
    queryFn: () =>
      api.get<ApiCalendarEvent[]>("/api/calendar/events", {
        params: { start: calRange.start, end: calRange.end },
      }),
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await api.get<StaffUser[] | { users?: StaffUser[] }>("/api/admin/users");
      return Array.isArray(response) ? response : response.users ?? [];
    },
  });


  const createEventMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      console.log("[calendar.diag] POST /api/calendar/events body JSON:", JSON.stringify(payload)); // BF_CALENDAR_DIAG_v30
      const response = await api.post("/api/calendar/events", payload);
      console.log("[calendar.diag] POST /api/calendar/events response JSON:", JSON.stringify(response)); // BF_CALENDAR_DIAG_v30
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setShowEventForm(false);
      setEventForm({ title: "", start: "", end: "", attendees: "", location: "", notes: "" });
    },
  });

  const events = useMemo<CalendarEvent[]>(() => {
    // BF_PORTAL_BLOCK_v624_COMMS_AND_CALENDAR_v1 — calendar grid shows
    // EVENTS only. Tasks have their own right-side panel (per Todd's #14).
    const list = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
    return list
      .filter((event) => event.start && event.end)
      .map((event) => ({
        id: event.id,
        title: event.title ?? "Untitled",
        // BF_PORTAL_BLOCK_v711 — Graph returns UTC wall-clock without a 'Z';
        // new Date() then mis-reads it as local. Append 'Z' when no tz so the
        // browser converts UTC -> local. Already-zoned strings pass through.
        start: new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(String(event.start)) ? String(event.start) : String(event.start).replace(/\.\d+$/, "") + "Z"),
        end: new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(String(event.end)) ? String(event.end) : String(event.end).replace(/\.\d+$/, "") + "Z"),
        resource: { ...event, source: "calendar" as const },
      }));
  }, [eventsQuery.data]);


  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 16, minHeight: "calc(100vh - 160px)" }}>
      <section style={{ background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: 12 }}>
        {/* BF_PORTAL_BLOCK_v610_CALENDAR_FIXES_v1 — the default rbc-toolbar label
            was being suppressed by a global stylesheet. Render the month/year
            ourselves so staff actually knows what they're looking at. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            Calendar — <span style={{ color: "var(--ui-text-muted)", fontWeight: 500 }}>{format(currentDate, view === "day" ? "EEEE, MMMM d, yyyy" : view === "week" ? "'Week of' MMMM d, yyyy" : "MMMM yyyy")}</span>
          </h2>
          <button onClick={() => setShowEventForm(true)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--ui-accent-blue)", background: "var(--ui-accent-blue)", color: "#fff" }}>
            Add Event
          </button>
        </div>

        {/* BF_PORTAL_BLOCK_v623_MEGAFIX_v1 — force date-cell visibility.
            Day numbers (1-31) weren't appearing in non-boundary rows. */}
        <style>{`
          .rbc-date-cell { display: block !important; padding: 4px 8px !important; text-align: right; font-size: 13px; color: var(--ui-text); }
          .rbc-date-cell > a, .rbc-date-cell > button { color: inherit !important; text-decoration: none; pointer-events: auto; }
          .rbc-date-cell.rbc-now > a, .rbc-date-cell.rbc-now > button { font-weight: 700; color: var(--ui-accent-fg); }
          .rbc-off-range-bg { background: var(--ui-surface); }
          .rbc-off-range .rbc-button-link { color: var(--ui-text-muted) !important; }
          .rbc-event { cursor: pointer; }
          .rbc-time-view .rbc-time-header-content { font-size: 12px; }
          .rbc-time-slot { font-size: 11px; color: var(--ui-text-muted); }
          /* BF_PORTAL_v_CONTRAST_PASS2_RBC_DARK — react-big-calendar ships light CSS; dark-theme the time/month grid */
          .rbc-time-view, .rbc-month-view, .rbc-time-content, .rbc-time-header, .rbc-time-header-content, .rbc-time-gutter, .rbc-day-slot, .rbc-day-bg, .rbc-month-row { background: var(--ui-surface-strong) !important; color: var(--ui-text); border-color: var(--ui-border) !important; }
          .rbc-time-view, .rbc-month-view { border: 1px solid var(--ui-border) !important; }
          .rbc-header, .rbc-time-header-gutter { background: var(--ui-surface-strong) !important; color: var(--ui-text-soft) !important; border-color: var(--ui-border) !important; }
          .rbc-time-content > * + * > *, .rbc-timeslot-group, .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-header + .rbc-header, .rbc-time-content, .rbc-time-header-content { border-color: var(--ui-border) !important; }
          .rbc-today { background: color-mix(in srgb, var(--ui-accent-blue) 14%, transparent) !important; }
          .rbc-label { color: var(--ui-text-muted) !important; }
          .rbc-current-time-indicator { background: var(--ui-accent-blue) !important; }
          .rbc-event, .rbc-day-slot .rbc-event { background: var(--ui-accent-blue) !important; color: #fff !important; border: none !important; }
          .rbc-show-more { background: transparent !important; color: var(--ui-accent-fg) !important; }
        `}</style>
        <div style={{ height: 700, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, padding: "0 0 8px 0" }}>
            {/* BF_PORTAL_BLOCK_v712 — prev / today / next, scoped to the active view */}
            <button onClick={() => setCurrentDate((d) => { const x = new Date(d); if (view === "month") x.setMonth(x.getMonth() - 1); else if (view === "year") x.setFullYear(x.getFullYear() - 1); else x.setDate(x.getDate() - (view === "work_week" ? 7 : 1)); return x; })} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>‹ Prev</button>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>Today</button>
            <button onClick={() => setCurrentDate((d) => { const x = new Date(d); if (view === "month") x.setMonth(x.getMonth() + 1); else if (view === "year") x.setFullYear(x.getFullYear() + 1); else x.setDate(x.getDate() + (view === "work_week" ? 7 : 1)); return x; })} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>Next ›</button>
            <button onClick={() => setView("day")}    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: view === "day" ? "var(--ui-accent-blue)" : "var(--ui-surface-strong)", color: view === "day" ? "#fff" : "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>Day</button>
            <button onClick={() => setView("work_week")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: view === "work_week" ? "var(--ui-accent-blue)" : "var(--ui-surface-strong)", color: view === "work_week" ? "#fff" : "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>Week</button>
            <button onClick={() => setView("month")}  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: view === "month" ? "var(--ui-accent-blue)" : "var(--ui-surface-strong)", color: view === "month" ? "#fff" : "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>Month</button>
            <button onClick={() => setView("year")}   style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: view === "year" ? "var(--ui-accent-blue)" : "var(--ui-surface-strong)", color: view === "year" ? "#fff" : "var(--ui-text)", fontSize: 13, cursor: "pointer" }}>Year</button>
          </div>

          {view === "year" ? (
            <YearView
              year={currentDate.getFullYear()}
              events={events}
              onPrevYear={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))}
              onNextYear={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))}
              onPickDay={(d) => { setCurrentDate(d); setView("day"); }}
            />
          ) : (
            <Calendar<CalendarEvent>
              localizer={localizer}
              events={events}
              views={{ day: true, work_week: true, month: true }}
              view={view as View}
              onView={(nextView: View) => setView(nextView)}
              date={currentDate}
              onNavigate={(d: Date) => setCurrentDate(d)}
              defaultView="day"
              min={minTime}
              max={maxTime}
              step={30}
              timeslots={2}
              dayLayoutAlgorithm="no-overlap"
              allDayMaxRows={2}
              onSelectEvent={(event: CalendarEvent) => {
                setSelectedEvent(event);
              }}
              eventPropGetter={(event: CalendarEvent) => {
                const isTask = ((event.resource as any)?.__kind === "task");
                return { style: { backgroundColor: isTask ? "#fed7aa" : "var(--ui-accent-blue)", borderColor: isTask ? "#c2410c" : "var(--ui-accent-blue)", color: isTask ? "#9a3412" : "var(--ui-surface-strong)" } };
              }}
              popup
              toolbar={false}
            />
          )}
        </div>
      </section>

      {/* BF_PORTAL_CAL_TASKS_HUBSPOT_v1 - full HubSpot-style Tasks panel,
          wired to /api/tasks (queues, runner, task types). Replaces the old
          cramped Overdue/Due-Today list + Add Task modal. */}
      <CalendarTasksPanel currentUserId={(user as { id?: string } | null)?.id ?? ""} />

      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: "min(560px, 90vw)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{selectedEvent.title}</h3>
            <p><strong>Date/Time:</strong> {selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}</p>
            <p><strong>Attendees:</strong> {Array.isArray(selectedEvent.resource.attendees) ? selectedEvent.resource.attendees.join(", ") : (selectedEvent.resource.attendees ?? "—")}</p>
            <p><strong>Location:</strong> {selectedEvent.resource.location ?? "—"}</p>
            {(selectedEvent.resource.teams_link || selectedEvent.resource.teamsLink) && (
              <p style={{ margin: "10px 0" }}>
                <a target="_blank" rel="noreferrer"
                   href={selectedEvent.resource.teams_link ?? selectedEvent.resource.teamsLink}
                   style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5b5fc7", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>
                  Join Teams meeting
                </a>
              </p>
            )}
            {/* BF_PORTAL_BLOCK_v712 — Teams invites stuff raw HTML into notes; strip tags to readable text. */}
            <p style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}><strong>Notes:</strong> {(() => {
              const n = selectedEvent.resource.notes;
              if (!n) return "—";
              const text = String(n)
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/\s+/g, " ")
                .trim();
              if (!text) return "—";
              return text.length > 600 ? text.slice(0, 600) + "…" : text;
            })()}</p>
            <button onClick={() => setSelectedEvent(null)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)" }}>
              Close
            </button>
          </div>
        </div>
      )}
      {showEventForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: "min(560px, 90vw)", background: "var(--ui-surface-strong)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add Event</h3>
            <label style={fieldRow}>
              <span style={fieldLabel}>Title</span>
              <input
                type="text"
                value={eventForm.title}
                onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
                style={calInputStyle}
              />
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Start</span>
              <input
                type="datetime-local"
                value={eventForm.start}
                onChange={(e) => setEventForm((prev) => ({ ...prev, start: e.target.value }))}
                style={calInputStyle}
              />
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>End</span>
              <input
                type="datetime-local"
                value={eventForm.end}
                onChange={(e) => setEventForm((prev) => ({ ...prev, end: e.target.value }))}
                style={calInputStyle}
              />
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Location</span>
              <input
                type="text"
                value={eventForm.location}
                onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location, Teams link, or address"
                style={calInputStyle}
              />
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Notes</span>
              <textarea
                value={eventForm.notes}
                onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={4}
                style={calInputStyle}
              />
            </label>
            {/* BF_PORTAL_CALENDAR_RANGE_GUARD_v1 - block save when End is not after Start */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {eventForm.title.trim() && eventForm.start && eventForm.end && new Date(eventForm.end).getTime() > new Date(eventForm.start).getTime() ? (
                <button onClick={() => createEventMutation.mutate({ ...eventForm, start: localInputToUtcIso(eventForm.start), end: localInputToUtcIso(eventForm.end) })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--ui-accent-blue)", background: "var(--ui-accent-blue)", color: "#fff" }}>Save</button>
              ) : null}
              <SecondaryButton onClick={() => setShowEventForm(false)}>Cancel</SecondaryButton>
              {!!eventForm.start && !!eventForm.end && new Date(eventForm.end).getTime() <= new Date(eventForm.start).getTime() && (
                <span style={{ color: "#dc2626", fontSize: 12 }}>End must be after start.</span>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

const fieldRow: CSSProperties = { display: "block", marginBottom: 12 };
const fieldLabel: CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--ui-text-muted)", marginBottom: 4,
};
const calInputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--ui-border)",
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--ui-surface-strong)",
  color: "var(--ui-text)",
  colorScheme: "light",
  fontSize: 14,
};

const CalendarPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <CalendarContent />
  </RequireRole>
);

function YearView({
  year,
  events,
  onPrevYear,
  onNextYear,
  onPickDay,
}: {
  year: number;
  events: CalendarEvent[];
  onPrevYear: () => void;
  onNextYear: () => void;
  onPickDay: (d: Date) => void;
}) {
  const eventDays = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      const d = new Date(e.start);
      s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return s;
  }, [events]);

  const months = Array.from({ length: 12 }, (_, m) => m);
  const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function monthCells(monthIdx: number): Array<{ key: string; day: number | null; date: Date | null }> {
    const first = new Date(year, monthIdx, 1);
    const offset = first.getDay();
    const daysIn = new Date(year, monthIdx + 1, 0).getDate();
    const cells: Array<{ key: string; day: number | null; date: Date | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ key: `b-${monthIdx}-${i}`, day: null, date: null });
    for (let d = 1; d <= daysIn; d++) {
      const dt = new Date(year, monthIdx, d);
      cells.push({ key: `${monthIdx}-${d}`, day: d, date: dt });
    }
    while (cells.length % 7 !== 0) cells.push({ key: `a-${monthIdx}-${cells.length}`, day: null, date: null });
    return cells;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, background: "var(--ui-surface-strong)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={onPrevYear} style={{ padding: "6px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer" }}>← {year - 1}</button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>{year}</h2>
        <button onClick={onNextYear} style={{ padding: "6px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", cursor: "pointer" }}>{year + 1} →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {months.map((m) => {
          const name = new Date(year, m, 1).toLocaleDateString(undefined, { month: "long" });
          return (
            <div key={m} style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ui-text)", marginBottom: 6 }}>{name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 11 }}>
                {dayLetters.map((l, i) => (
                  <div key={`h-${m}-${i}`} style={{ textAlign: "center", color: "var(--ui-text-muted)", fontWeight: 600, padding: "2px 0" }}>{l}</div>
                ))}
                {monthCells(m).map((cell) => {
                  if (cell.day == null) return <div key={cell.key} />;
                  const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                  const hasEvent = eventDays.has(key);
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={cell.key}
                      onClick={() => cell.date && onPickDay(cell.date)}
                      style={{
                        position: "relative",
                        textAlign: "center",
                        padding: "4px 0",
                        border: 0,
                        background: isToday ? "rgba(47, 168, 106, 0.12)" : "transparent",
                        color: isToday ? "var(--ui-accent-blue)" : "var(--ui-text)",
                        fontWeight: isToday ? 700 : 400,
                        cursor: "pointer",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      {cell.day}
                      {hasEvent && (
                        <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "var(--ui-accent-blue)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarPage;
