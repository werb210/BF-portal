// BF_PORTAL_CAL_TASKS_HUBSPOT_v1 - the HubSpot-style Tasks experience, living
// in the Calendar tab's right panel (no separate nav tab). Wired to the
// /api/tasks backend (queues, runner, task types). Replaces the old cramped
// Overdue/Due-Today sidebar.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import TaskRunner, { type RunTask } from "@/pages/tasks/TaskRunner";
import ManageQueuesModal from "@/pages/tasks/ManageQueuesModal";
import TaskModal from "@/components/tasks/TaskModal";

type Queue = { id: string; name: string; access_type: string; open_count: number };
type Staff = { id: string; name: string };
type Task = {
  id: string; title: string; body: string | null; type: string; status: string;
  priority: string; due_at: string | null; reminder_at: string | null;
  queue_id: string | null; queue_name: string | null;
  assignee_user_id: string | null; assignee_name: string | null;
  contact_id: string | null; contact_name: string | null;
  company_id: string | null; company_name: string | null; completed_at: string | null;
};

const VIEWS = [
  { key: "due_today", label: "Due today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
] as const;
const TYPES = ["CALL", "EMAIL", "SMS", "TODO"] as const;
const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;
const TYPE_LABEL: Record<string, string> = { CALL: "Call", EMAIL: "Email", SMS: "SMS", TODO: "To-do" };
const PRIORITY_DOT: Record<string, string> = { NONE: "transparent", LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#dc2626" };

function unwrap<T>(r: unknown): T {
  const anyR = r as { data?: T } | T;
  return ((anyR as { data?: T })?.data ?? anyR) as T;
}

const ctl: CSSProperties = {
  background: "var(--ui-surface-strong)", color: "var(--ui-text)",
  border: "1px solid var(--ui-border)", borderRadius: 8, padding: "5px 8px", fontSize: 13,
};

export default function CalendarTasksPanel({ currentUserId }: { currentUserId: string }) {
  const [view, setView] = useState<string>("due_today");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [queueId, setQueueId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showQueues, setShowQueues] = useState(false);
  const [runTasks, setRunTasks] = useState<RunTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ view });
    if (type) qs.set("type", type);
    if (priority) qs.set("priority", priority);
    if (queueId) qs.set("queue_id", queueId);
    if (assignee) qs.set("assignee", assignee);
    Promise.all([
      api.get<unknown>(`/api/tasks?${qs.toString()}`),
      api.get<unknown>("/api/tasks/queues"),
      api.get<unknown>("/api/tasks/staff"),
    ])
      .then(([t, q, st]) => {
        setTasks(unwrap<{ tasks: Task[] }>(t).tasks ?? []);
        setQueues(unwrap<{ queues: Queue[] }>(q).queues ?? []);
        setStaff(unwrap<{ staff: Staff[] }>(st).staff ?? []);
        setSelected({});
        setError(null);
      })
      .catch(() => setError("Failed to load tasks."))
      .finally(() => setLoading(false));
  }, [view, type, priority, queueId, assignee]);

  useEffect(() => { load(); }, [load]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const openCount = view === "completed" ? 0 : tasks.length;

  const complete = (ids: string[]) => {
    if (!ids.length) return;
    const call = ids.length === 1
      ? api.post(`/api/tasks/${ids[0]}/complete`, {})
      : api.post("/api/tasks/bulk", { action: "complete", ids });
    call.then(load).catch(() => setError("Failed to complete."));
  };

  const startRun = () => {
    api.post<unknown>("/api/tasks/runs", { view, type: type || null, priority: priority || null, queue_id: queueId || null })
      .then((r) => setRunTasks(unwrap<{ tasks: RunTask[] }>(r).tasks ?? []))
      .catch(() => setError("Failed to start run."));
  };

  return (
    <aside style={{ background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 }} data-testid="calendar-tasks-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Tasks</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {view !== "completed" && tasks.length > 0 && (
            <button onClick={startRun} style={{ ...ctl, fontWeight: 600, background: "var(--ui-accent-blue)", color: "#fff", borderColor: "var(--ui-accent-blue)", cursor: "pointer" }}>
              Start {tasks.length} tasks
            </button>
          )}
          <button onClick={() => setShowQueues(true)} style={{ ...ctl, cursor: "pointer" }}>Manage queues</button>
          <button onClick={() => setShowCreate(true)} style={{ ...ctl, fontWeight: 600, borderColor: "var(--ui-accent-blue)", color: "var(--ui-accent-blue)", cursor: "pointer" }}>Create task</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)} style={{ ...ctl, borderRadius: 999, cursor: "pointer", fontWeight: view === v.key ? 700 : 400, borderColor: view === v.key ? "var(--ui-accent-blue)" : "var(--ui-border)", color: view === v.key ? "var(--ui-accent-blue)" : "var(--ui-text)" }}>
            {v.label}{v.key === view && v.key !== "completed" ? ` (${openCount})` : ""}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={ctl}>
          <option value="">All assignees</option>
          <option value={currentUserId}>Assigned to me</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} style={ctl}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={ctl}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={queueId} onChange={(e) => setQueueId(e.target.value)} style={ctl}>
          <option value="">All queues</option>
          {queues.map((q) => <option key={q.id} value={q.id}>{q.name} ({q.open_count})</option>)}
        </select>
        {(type || priority || queueId || assignee) && <button onClick={() => { setType(""); setPriority(""); setQueueId(""); setAssignee(""); }} style={{ ...ctl, cursor: "pointer" }}>Clear all</button>}
        {selectedIds.length > 0 && view !== "completed" && <button onClick={() => complete(selectedIds)} style={{ ...ctl, fontWeight: 600, cursor: "pointer" }}>Complete {selectedIds.length}</button>}
      </div>

      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>}
      {!loading && tasks.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No tasks in this view.</p>}

      {tasks.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ color: "var(--ui-text-muted)", textAlign: "left" }}><th style={{ padding: "6px 4px", width: 22 }}></th><th style={{ padding: "6px 4px" }}>Title</th><th style={{ padding: "6px 4px", width: 52 }}>Type</th><th style={{ padding: "6px 4px" }}>Contact</th><th style={{ padding: "6px 4px" }}>Due</th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--ui-border)", color: "var(--ui-text)" }}>
                <td style={{ padding: "6px 4px" }}><input type="checkbox" checked={view === "completed" ? true : !!selected[t.id]} disabled={view === "completed"} onChange={(e) => { if (view !== "completed") setSelected((p) => ({ ...p, [t.id]: e.target.checked })); }} aria-label={`Select ${t.title}`} /></td>
                <td style={{ padding: "6px 4px" }}><button onClick={() => complete([t.id])} disabled={view === "completed"} title="Complete task" style={{ background: "none", border: "none", color: "var(--ui-text)", cursor: view === "completed" ? "default" : "pointer", padding: 0, textAlign: "left", fontWeight: 500 }}>{t.title}</button>{t.queue_name && <span style={{ marginLeft: 6, color: "var(--ui-text-muted)" }}> &middot; {t.queue_name}</span>}</td>
                <td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: PRIORITY_DOT[t.priority] ?? "transparent", marginRight: 5 }} />{TYPE_LABEL[t.type] ?? t.type}</td>
                <td style={{ padding: "6px 4px" }}>{t.contact_name ?? "--"}</td>
                <td style={{ padding: "6px 4px", whiteSpace: "nowrap" }}>{t.due_at ? new Date(t.due_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && <TaskModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {showQueues && <ManageQueuesModal onClose={() => { setShowQueues(false); load(); }} />}
      {runTasks && <TaskRunner tasks={runTasks} onExit={() => { setRunTasks(null); load(); }} />}
    </aside>
  );
}
