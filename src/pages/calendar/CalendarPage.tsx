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
};

type CalendarEvent = {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: ApiCalendarEvent & { source?: "calendar" | "task"; taskId?: string; taskState?: "overdue" | "dueToday" | "upcoming" };
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
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", start: "", end: "", attendees: "", location: "", notes: "" });
  const [taskForm, setTaskForm] = useState({ title: "", dueAt: "", priority: "normal", assignee_user_id: (user as { id?: string } | null)?.id ?? "", notes: "" });
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => api.get<ApiCalendarEvent[]>("/api/calendar/events"),
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await api.get<StaffUser[] | { users?: StaffUser[] }>("/api/admin/users");
      return Array.isArray(response) ? response : response.users ?? [];
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["calendar-tasks"],
    queryFn: async () => {
      const response = await api.get<CalendarTask[]>("/api/calendar/tasks");
      console.log("[tasks.diag] GET /api/calendar/tasks response JSON:", JSON.stringify(response)); // BF_TASKS_DIAG_v30
      return response;
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

  const createTaskMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      console.log("[tasks.diag] POST /api/calendar/tasks body JSON:", JSON.stringify(payload)); // BF_TASKS_DIAG_v30
      const response = await api.post("/api/calendar/tasks", payload);
      console.log("[tasks.diag] POST /api/calendar/tasks response JSON:", JSON.stringify(response)); // BF_TASKS_DIAG_v30
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      setShowTaskForm(false);
      setTaskForm({ title: "", dueAt: "", priority: "normal", assignee_user_id: (user as { id?: string } | null)?.id ?? "", notes: "" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (task: CalendarTask) => api.patch(`/api/calendar/tasks/${task.id}`, { status: (task.status === "done" || Boolean(task.completedAt) || Boolean(task.completed)) ? "open" : "done" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] }),
  });

  const groupedTasks = useMemo(() => groupTasks(Array.isArray(tasksQuery.data) ? tasksQuery.data : []), [tasksQuery.data]);

  const events = useMemo<CalendarEvent[]>(() => {
    // BF_PORTAL_BLOCK_v624_COMMS_AND_CALENDAR_v1 — calendar grid shows
    // EVENTS only. Tasks have their own right-side panel (per Todd's #14).
    const list = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
    return list
      .filter((event) => event.start && event.end)
      .map((event) => ({
        id: event.id,
        title: event.title ?? "Untitled",
        start: new Date(event.start as string),
        end: new Date(event.end as string),
        resource: { ...event, source: "calendar" as const },
      }));
  }, [eventsQuery.data]);
  void tasksQuery; // tasks still loaded for the right-side panel below

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 16, minHeight: "calc(100vh - 160px)" }}>
      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
        {/* BF_PORTAL_BLOCK_v610_CALENDAR_FIXES_v1 — the default rbc-toolbar label
            was being suppressed by a global stylesheet. Render the month/year
            ourselves so staff actually knows what they're looking at. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            Calendar — <span style={{ color: "#475569", fontWeight: 500 }}>{format(currentDate, view === "day" ? "EEEE, MMMM d, yyyy" : view === "week" ? "'Week of' MMMM d, yyyy" : "MMMM yyyy")}</span>
          </h2>
          <button onClick={() => setShowEventForm(true)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}>
            Add Event
          </button>
        </div>

        {/* BF_PORTAL_BLOCK_v623_MEGAFIX_v1 — force date-cell visibility.
            Day numbers (1-31) weren't appearing in non-boundary rows. */}
        <style>{`
          .rbc-date-cell { display: block !important; padding: 4px 8px !important; text-align: right; font-size: 13px; color: #1e293b; }
          .rbc-date-cell > a, .rbc-date-cell > button { color: inherit !important; text-decoration: none; pointer-events: auto; }
          .rbc-date-cell.rbc-now > a, .rbc-date-cell.rbc-now > button { font-weight: 700; color: #2563eb; }
          .rbc-off-range-bg { background: #f5f7fb; }
          .rbc-off-range .rbc-button-link { color: #94a3b8 !important; }
          .rbc-event { cursor: pointer; }
          .rbc-time-view .rbc-time-header-content { font-size: 12px; }
          .rbc-time-slot { font-size: 11px; color: #475569; }
        `}</style>
        <div style={{ height: 700, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, padding: "0 0 8px 0" }}>
            <button onClick={() => setView("day")}    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd6e2", background: view === "day" ? "#0066cc" : "#fff", color: view === "day" ? "#fff" : "#0f172a", fontSize: 13, cursor: "pointer" }}>Day</button>
            <button onClick={() => setView("work_week")} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd6e2", background: view === "work_week" ? "#0066cc" : "#fff", color: view === "work_week" ? "#fff" : "#0f172a", fontSize: 13, cursor: "pointer" }}>Week</button>
            <button onClick={() => setView("month")}  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd6e2", background: view === "month" ? "#0066cc" : "#fff", color: view === "month" ? "#fff" : "#0f172a", fontSize: 13, cursor: "pointer" }}>Month</button>
            <button onClick={() => setView("year")}   style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd6e2", background: view === "year" ? "#0066cc" : "#fff", color: view === "year" ? "#fff" : "#0f172a", fontSize: 13, cursor: "pointer" }}>Year</button>
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
              onSelectEvent={(event: CalendarEvent) => setSelectedEvent(event)}
              eventPropGetter={() => ({ style: { backgroundColor: "#2563eb", borderColor: "#1d4ed8", color: "#fff" } })}
              popup
              toolbar={false}
            />
          )}
        </div>
      </section>

      <aside style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Tasks</h3>
          <button onClick={() => setShowTaskForm(true)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #0f766e", background: "#0f766e", color: "#fff" }}>
            Add Task
          </button>
        </div>

        {tasksQuery.isLoading && <p>Loading tasks…</p>}

        {/* BF_PORTAL_BLOCK_v610_CALENDAR_FIXES_v1 — added Completed bucket */}
        {[
          ["Overdue", groupedTasks.overdue, "#dc2626"],
          ["Due Today", groupedTasks.dueToday, "#f97316"],
          ["Upcoming", groupedTasks.upcoming, "#0f172a"],
          ["No Due Date", groupedTasks.noDueDate, "#64748b"],
          ["Completed", groupedTasks.completed, "#10b981"],
        ].map(([label, items, color]) => (
          <div key={label as string} style={{ marginBottom: 14 }}>
            <h4 style={{ margin: "0 0 8px", color: color as string, fontSize: 14 }}>{label as string}</h4>
            {(items as CalendarTask[]).length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>None</p>
            ) : (
              (items as CalendarTask[]).map((task) => (
                <div key={task.id ?? `${task.title}-${task.due_date}`} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
                  <input type="checkbox" style={{ marginTop: 3 }} checked={task.status === "done" || Boolean(task.completedAt) || Boolean(task.completed)} onChange={() => task.id && completeTaskMutation.mutate(task)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", wordBreak: "break-word" }}>
                      {(typeof task.title === "string" && task.title.trim()) ? task.title : "Untitled task"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Due: {(task.dueAt ?? task.due_date ?? task.dueDate) ? new Date(task.dueAt ?? task.due_date ?? task.dueDate ?? "").toLocaleString() : "-"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Assigned to: {(() => {
                      const assigneeName = task.assignee_name ?? task.assigneeName;
                      const assigneeEmail = task.assignee_email ?? task.assigneeEmail;
                      return assigneeName || assigneeEmail || "-";
                    })()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </aside>

      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: "min(560px, 90vw)", background: "#fff", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{selectedEvent.title}</h3>
            <p><strong>Date/Time:</strong> {selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}</p>
            <p><strong>Attendees:</strong> {Array.isArray(selectedEvent.resource.attendees) ? selectedEvent.resource.attendees.join(", ") : (selectedEvent.resource.attendees ?? "—")}</p>
            <p><strong>Location:</strong> {selectedEvent.resource.location ?? "—"}</p>
            {(selectedEvent.resource.teams_link || selectedEvent.resource.teamsLink) && (
              <p><strong>Teams Link:</strong> <a target="_blank" rel="noreferrer" href={selectedEvent.resource.teams_link ?? selectedEvent.resource.teamsLink}>Open meeting</a></p>
            )}
            <p><strong>Notes:</strong> {selectedEvent.resource.notes ?? "—"}</p>
            <button onClick={() => setSelectedEvent(null)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {showEventForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: "min(560px, 90vw)", background: "#fff", borderRadius: 12, padding: 16 }}>
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
            <div style={{ display: "flex", gap: 8 }}>
              {eventForm.title.trim() && eventForm.start && eventForm.end ? (
                <button onClick={() => createEventMutation.mutate(eventForm)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}>Save</button>
              ) : null}
              <SecondaryButton onClick={() => setShowEventForm(false)}>Cancel</SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {showTaskForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div style={{ width: "min(560px, 90vw)", background: "#fff", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add Task</h3>
            <label style={fieldRow}>
              <span style={fieldLabel}>Title</span>
              <input
                type="text"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                style={calInputStyle}
              />
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Due</span>
              <input
                type="datetime-local"
                value={taskForm.dueAt}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, dueAt: e.target.value }))}
                style={calInputStyle}
              />
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Priority</span>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                style={calInputStyle}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Assignee</span>
              <select
                value={taskForm.assignee_user_id}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, assignee_user_id: e.target.value }))}
                style={calInputStyle}
              >
                {(((usersQuery.data as StaffUser[] | undefined) ?? [])).map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name || `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || staff.email || staff.id}
                  </option>
                ))}
                {(!usersQuery.data || (usersQuery.data as StaffUser[]).length === 0) && taskForm.assignee_user_id && (
                  <option value={taskForm.assignee_user_id}>Current user</option>
                )}
              </select>
            </label>
            <label style={fieldRow}>
              <span style={fieldLabel}>Notes</span>
              <textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={4}
                style={calInputStyle}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {taskForm.title.trim() ? (
                <button onClick={() => createTaskMutation.mutate(taskForm)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #0f766e", background: "#0f766e", color: "#fff" }}>Save</button>
              ) : null}
              <SecondaryButton onClick={() => setShowTaskForm(false)}>Cancel</SecondaryButton>
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
  color: "#33475b", marginBottom: 4,
};
const calInputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  padding: "8px 10px",
  borderRadius: 8,
  background: "#fff",
  color: "#000",
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
    <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={onPrevYear} style={{ padding: "6px 12px", border: "1px solid #cbd6e2", borderRadius: 6, background: "#fff", cursor: "pointer" }}>← {year - 1}</button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{year}</h2>
        <button onClick={onNextYear} style={{ padding: "6px 12px", border: "1px solid #cbd6e2", borderRadius: 6, background: "#fff", cursor: "pointer" }}>{year + 1} →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {months.map((m) => {
          const name = new Date(year, m, 1).toLocaleDateString(undefined, { month: "long" });
          return (
            <div key={m} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>{name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 11 }}>
                {dayLetters.map((l, i) => (
                  <div key={`h-${m}-${i}`} style={{ textAlign: "center", color: "#94a3b8", fontWeight: 600, padding: "2px 0" }}>{l}</div>
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
                        background: isToday ? "#dbeafe" : "transparent",
                        color: isToday ? "#1d4ed8" : "#0f172a",
                        fontWeight: isToday ? 700 : 400,
                        cursor: "pointer",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      {cell.day}
                      {hasEvent && (
                        <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#2563eb" }} />
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
