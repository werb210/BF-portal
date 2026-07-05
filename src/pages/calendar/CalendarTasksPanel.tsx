// BF_PORTAL_CAL_TASKS_HUBSPOT_v1 - the HubSpot-style Tasks experience, living
// in the Calendar tab's right panel (no separate nav tab). Wired to the
// /api/tasks backend (queues, runner, task types). Replaces the old cramped
// Overdue/Due-Today sidebar.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api } from "@/api";
import TaskRunner, { type RunTask } from "@/pages/tasks/TaskRunner";
import ManageQueuesModal from "@/pages/tasks/ManageQueuesModal";

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

      {showCreate && <CreateTaskDialog queues={queues} staff={staff} currentUserId={currentUserId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {showQueues && <ManageQueuesModal onClose={() => { setShowQueues(false); load(); }} />}
      {runTasks && <TaskRunner tasks={runTasks} onExit={() => { setRunTasks(null); load(); }} />}
    </aside>
  );
}

function DateTimePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value) : null;
  const [viewMonth, setViewMonth] = useState(() => (selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = selected ? selected.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Set date & time";
  const setDatePart = (day: Date) => {
    const base = selected ?? new Date(new Date().setHours(9, 0, 0, 0));
    onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes(), 0, 0).toISOString());
  };
  const setTimePart = (hh: number, mm: number) => {
    const base = selected ?? new Date();
    onChange(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0).toISOString());
  };
  const monthDays = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
    for (let d = 1; d <= new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate(); d += 1) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return cells;
  }, [viewMonth]);
  const times = [] as { label: string; hh: number; mm: number }[];
  for (let h = 7; h <= 19; h += 1) for (const m of [0, 30]) { const d = new Date(); d.setHours(h, m, 0, 0); times.push({ label: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), hh: h, mm: m }); }
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ ...ctl, width: "100%", textAlign: "left", cursor: "pointer" }}>{label}</button>
      {open && (
        <div style={{ position: "absolute", zIndex: 60, top: "calc(100% + 4px)", left: 0, display: "flex", gap: 8, background: "var(--ui-surface, #fff)", border: "1px solid var(--ui-border)", borderRadius: 10, padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={{ ...ctl, padding: "2px 8px", cursor: "pointer" }}>{"<"}</button>
              <strong style={{ fontSize: 13 }}>{viewMonth.toLocaleString([], { month: "long", year: "numeric" })}</strong>
              <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={{ ...ctl, padding: "2px 8px", cursor: "pointer" }}>{">"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, color: "var(--ui-text-muted)" }}>{d}</div>)}
              {monthDays.map((d, i) => <button key={i} type="button" disabled={!d} onClick={() => d && setDatePart(d)} style={{ width: 28, height: 28, borderRadius: 6, fontSize: 12, cursor: d ? "pointer" : "default", border: d && selected && sameDay(d, selected) ? "1px solid var(--ui-accent-blue)" : "1px solid transparent", background: d && selected && sameDay(d, selected) ? "var(--ui-accent-blue)" : "transparent", color: d && selected && sameDay(d, selected) ? "#fff" : "var(--ui-text)" }}>{d ? d.getDate() : ""}</button>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><button type="button" onClick={() => { onChange(""); setOpen(false); }} style={{ ...ctl, padding: "2px 8px", cursor: "pointer" }}>Clear</button><button type="button" onClick={() => setDatePart(new Date())} style={{ ...ctl, padding: "2px 8px", cursor: "pointer" }}>Today</button></div>
          </div>
          <div style={{ width: 92, maxHeight: 232, overflowY: "auto" }}>{times.map((t) => { const isSel = selected && selected.getHours() === t.hh && selected.getMinutes() === t.mm; return <button key={t.label} type="button" onClick={() => setTimePart(t.hh, t.mm)} style={{ display: "block", width: "100%", textAlign: "center", padding: "5px 0", fontSize: 12, borderRadius: 6, cursor: "pointer", border: "1px solid transparent", background: isSel ? "var(--ui-accent-blue)" : "transparent", color: isSel ? "#fff" : "var(--ui-text)" }}>{t.label}</button>; })}</div>
        </div>
      )}
    </div>
  );
}

const REMINDERS = [
  { value: "", label: "No reminder" },
  { value: "AT_DUE", label: "At task due time" },
  { value: "30M", label: "30 minutes before" },
  { value: "1H", label: "1 hour before" },
  { value: "1D", label: "1 day before" },
] as const;

function reminderIso(due: string, r: string): string | null {
  if (!due || !r) return null;
  const d = new Date(due);
  if (r === "AT_DUE") return d.toISOString();
  if (r === "30M") return new Date(d.getTime() - 30 * 60000).toISOString();
  if (r === "1H") return new Date(d.getTime() - 3600000).toISOString();
  if (r === "1D") return new Date(d.getTime() - 86400000).toISOString();
  return null;
}

function CreateTaskDialog({ queues, staff, currentUserId, onClose, onCreated }: { queues: Queue[]; staff: Staff[]; currentUserId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("TODO");
  const [priority, setPriority] = useState("NONE");
  const [queueId, setQueueId] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueAt, setDueAt] = useState("");
  const [reminder, setReminder] = useState("");
  const [repeatUnit, setRepeatUnit] = useState("");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onTitle = (v: string) => { setTitle(v); const low = v.toLowerCase(); if (low.includes("call")) setType("CALL"); else if (low.includes("email")) setType("EMAIL"); else if (low.includes("sms") || low.includes("text")) setType("SMS"); };
  const save = () => {
    if (!title.trim()) { setErr("Please enter a task title."); return; }
    api.post("/api/tasks", { title: title.trim(), type, priority, body: notes.trim() || null, due_at: dueAt || null, reminder_at: reminderIso(dueAt, reminder), queue_id: queueId || null, assignee_user_id: assigneeId || null, repeat_unit: repeatUnit || null, repeat_interval: repeatUnit ? repeatInterval : null }).then(onCreated).catch(() => setErr("Failed to create task."));
  };
  const field: CSSProperties = { display: "block", marginBottom: 10 };
  const lbl: CSSProperties = { display: "block", fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 3 };
  const full: CSSProperties = { ...ctl, width: "100%" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "grid", placeItems: "center", zIndex: 55 }}>
      <div style={{ width: "min(520px, 92vw)", background: "var(--ui-surface, #fff)", border: "1px solid var(--ui-border)", borderRadius: 12, padding: 16, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><h3 style={{ margin: 0 }}>Task</h3><button onClick={onClose} style={{ ...ctl, cursor: "pointer" }}>X</button></div>
        <label style={field}><input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Enter your task" style={{ ...full, fontSize: 15, padding: "8px 10px" }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={field}><span style={lbl}>Task type</span><select value={type} onChange={(e) => setType(e.target.value)} style={full}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></label>
          <label style={field}><span style={lbl}>Priority</span><select value={priority} onChange={(e) => setPriority(e.target.value)} style={full}>{PRIORITIES.map((p) => <option key={p} value={p}>{p === "NONE" ? "None" : p.charAt(0) + p.slice(1).toLowerCase()}</option>)}</select></label>
          <label style={field}><span style={lbl}>Queue</span><select value={queueId} onChange={(e) => setQueueId(e.target.value)} style={full}><option value="">None</option>{queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select></label>
          <label style={field}><span style={lbl}>Assigned to</span><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={full}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}{staff.length === 0 && <option value={currentUserId}>Me</option>}</select></label>
        </div>
        <label style={field}><span style={lbl}>Due date</span><DateTimePicker value={dueAt} onChange={setDueAt} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={field}><span style={lbl}>Send reminder</span><select value={reminder} onChange={(e) => setReminder(e.target.value)} style={full} disabled={!dueAt}>{REMINDERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
          <label style={field}><span style={lbl}>Repeat</span><div style={{ display: "flex", gap: 4 }}><input type="number" min={1} value={repeatInterval} disabled={!repeatUnit} onChange={(e) => setRepeatInterval(Math.max(1, Number(e.target.value)))} style={{ ...ctl, width: 52 }} /><select value={repeatUnit} onChange={(e) => setRepeatUnit(e.target.value)} style={{ ...ctl, flex: 1 }}><option value="">No repeat</option><option value="DAY">days</option><option value="WEEK">weeks</option><option value="MONTH">months</option><option value="YEAR">years</option></select></div></label>
        </div>
        <label style={field}><span style={lbl}>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={full} /></label>
        {err && <p role="alert" style={{ color: "#dc2626" }}>{err}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={onClose} style={{ ...ctl, cursor: "pointer" }}>Cancel</button><button onClick={save} style={{ ...ctl, fontWeight: 600, background: "var(--ui-accent-blue)", color: "#fff", borderColor: "var(--ui-accent-blue)", cursor: "pointer" }}>Create</button></div>
      </div>
    </div>
  );
}
