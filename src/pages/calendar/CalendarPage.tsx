import { useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { api } from "@/api";
import RequireRole from "@/components/auth/RequireRole";

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

type CalendarTask = {
  id?: string;
  title?: string;
  due_date?: string;
  dueDate?: string;
  assigned_to?: string;
  assignedTo?: string;
  completed?: boolean;
};

type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  resource: ApiCalendarEvent;
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
  };

  tasks.forEach((task) => {
    const due = task.due_date ?? task.dueDate;
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
  const [view, setView] = useState<View>("week");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", start: "", end: "", attendees: "", location: "", notes: "" });
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "normal", notes: "" });
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => api.get<ApiCalendarEvent[]>("/api/calendar/events"),
  });

  const tasksQuery = useQuery({
    queryKey: ["calendar-tasks"],
    queryFn: () => api.get<CalendarTask[]>("/api/calendar/tasks"),
  });

  const createEventMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/api/calendar/events", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setShowEventForm(false);
      setEventForm({ title: "", start: "", end: "", attendees: "", location: "", notes: "" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/api/calendar/tasks", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      setShowTaskForm(false);
      setTaskForm({ title: "", due_date: "", priority: "normal", notes: "" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (task: CalendarTask) => api.patch(`/api/calendar/tasks/${task.id}`, { completed: !task.completed }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] }),
  });

  const events = useMemo<CalendarEvent[]>(() => {
    const list = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
    return list
      .filter((event) => event.start && event.end)
      .map((event) => ({
        title: event.title ?? "Untitled",
        start: new Date(event.start as string),
        end: new Date(event.end as string),
        resource: event,
      }));
  }, [eventsQuery.data]);

  const groupedTasks = useMemo(() => groupTasks(Array.isArray(tasksQuery.data) ? tasksQuery.data : []), [tasksQuery.data]);

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 16, minHeight: "calc(100vh - 160px)" }}>
      <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Calendar</h2>
          <button onClick={() => setShowEventForm(true)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}>
            Add Event
          </button>
        </div>

        <div style={{ height: 700 }}>
          <Calendar<CalendarEvent>
            localizer={localizer}
            events={events}
            views={["month", "week", "day"]}
            view={view}
            onView={(nextView: View) => setView(nextView)}
            defaultView="week"
            onSelectEvent={(event: CalendarEvent) => setSelectedEvent(event)}
            popup
          />
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

        {[
          ["Overdue", groupedTasks.overdue, "#dc2626"],
          ["Due Today", groupedTasks.dueToday, "#f97316"],
          ["Upcoming", groupedTasks.upcoming, "#0f172a"],
          ["No Due Date", groupedTasks.noDueDate, "#64748b"],
        ].map(([label, items, color]) => (
          <div key={label as string} style={{ marginBottom: 14 }}>
            <h4 style={{ margin: "0 0 8px", color: color as string, fontSize: 14 }}>{label as string}</h4>
            {(items as CalendarTask[]).length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>None</p>
            ) : (
              (items as CalendarTask[]).map((task) => (
                <div key={task.id ?? `${task.title}-${task.due_date}`} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <input type="checkbox" checked={Boolean(task.completed)} onChange={() => task.id && completeTaskMutation.mutate(task)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{task.title ?? "Untitled task"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Due: {task.due_date ?? task.dueDate ? new Date(task.due_date ?? task.dueDate ?? "").toLocaleString() : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Assigned to: {task.assigned_to ?? task.assignedTo ?? "—"}</div>
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
              <button onClick={() => createEventMutation.mutate(eventForm)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "#fff" }}>Save</button>
              <button onClick={() => setShowEventForm(false)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>Cancel</button>
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
                value={taskForm.due_date}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, due_date: e.target.value }))}
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
              <span style={fieldLabel}>Notes</span>
              <textarea
                value={taskForm.notes}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={4}
                style={calInputStyle}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => createTaskMutation.mutate(taskForm)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #0f766e", background: "#0f766e", color: "#fff" }}>Save</button>
              <button onClick={() => setShowTaskForm(false)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>Cancel</button>
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
  width: "100%", padding: 8, border: "1px solid #cbd6e2",
  borderRadius: 4, background: "#ffffff", color: "#000000", fontSize: 14,
};

const CalendarPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <CalendarContent />
  </RequireRole>
);

export default CalendarPage;
