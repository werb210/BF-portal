// BF_PORTAL_TASKS_V1 - HubSpot-style Tasks index, Milestone 1 (spec: HubSpot
// Tasks & Queue Runner build spec). Standard views (Due today / Overdue /
// Upcoming / Completed), type/priority/queue filters, create modal, single +
// bulk complete. Silo-scoped: the api client carries the active silo, and
// switching silo in the topbar refetches everything.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type Queue = { id: string; name: string; access_type: string; open_count: number };
type Task = {
  id: string; title: string; body: string | null; type: string; status: string;
  priority: string; due_at: string | null; queue_id: string | null; queue_name: string | null;
  assignee_name: string | null; contact_id: string | null; contact_name: string | null;
  company_name: string | null; completed_at: string | null;
};

const VIEWS = [
  { key: "due_today", label: "Due today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
] as const;
const TYPES = ["CALL", "EMAIL", "SMS", "TODO"] as const;
const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;

const inputStyle: React.CSSProperties = {
  background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderColor: "var(--ui-border)",
};

function unwrap<T>(r: unknown): T { return ((r as { data?: unknown })?.data ?? r) as T; }

export default function TasksPage() {
  const [view, setView] = useState<string>("due_today");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [queueId, setQueueId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ view });
    if (type) qs.set("type", type);
    if (priority) qs.set("priority", priority);
    if (queueId) qs.set("queue_id", queueId);
    Promise.all([
      api.get<unknown>(`/api/tasks?${qs.toString()}`),
      api.get<unknown>("/api/tasks/queues"),
    ])
      .then(([t, q]) => {
        setTasks(unwrap<{ tasks: Task[] }>(t).tasks ?? []);
        setQueues(unwrap<{ queues: Queue[] }>(q).queues ?? []);
        setSelected({});
        setError(null);
      })
      .catch(() => setError("Failed to load tasks."))
      .finally(() => setLoading(false));
  }, [view, type, priority, queueId]);

  useEffect(() => { load(); }, [load]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const complete = (ids: string[]) => {
    if (!ids.length) return;
    const call = ids.length === 1
      ? api.post(`/api/tasks/${ids[0]}/complete`, {})
      : api.post("/api/tasks/bulk", { action: "complete", ids });
    call.then(load).catch(() => setError("Failed to complete."));
  };

  return (
    <div className="p-4" data-testid="tasks-page">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold" style={{ color: "var(--ui-text)" }}>Tasks</h1>
        <button className="border rounded px-3 py-1.5 text-sm font-semibold" style={inputStyle} onClick={() => setShowCreate(true)}>
          + Create task
        </button>
      </div>

      <div className="flex gap-2 flex-wrap items-center mb-3">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)}
            className="border rounded-full px-3 py-1 text-sm"
            style={{ ...inputStyle, fontWeight: view === v.key ? 700 : 400, borderColor: view === v.key ? "var(--ui-accent, #2563eb)" : "var(--ui-border)" }}>
            {v.label}
          </button>
        ))}
        <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-2 py-1 text-sm" style={inputStyle}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border rounded px-2 py-1 text-sm" style={inputStyle}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={queueId} onChange={(e) => setQueueId(e.target.value)} className="border rounded px-2 py-1 text-sm" style={inputStyle}>
          <option value="">All queues</option>
          {queues.map((q) => <option key={q.id} value={q.id}>{q.name} ({q.open_count})</option>)}
        </select>
        {selectedIds.length > 0 && view !== "completed" && (
          <button className="border rounded px-3 py-1 text-sm font-semibold" style={inputStyle} onClick={() => complete(selectedIds)}>
            Complete {selectedIds.length} selected
          </button>
        )}
      </div>

      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {loading && <p style={{ color: "var(--ui-text-muted)" }}>Loading...</p>}
      {!loading && tasks.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No tasks in this view.</p>}

      {tasks.length > 0 && (
        <table className="w-full text-sm border rounded" style={{ borderColor: "var(--ui-border)" }}>
          <thead>
            <tr style={{ color: "var(--ui-text-muted)" }}>
              <th className="p-2 text-left w-8"></th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Priority</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Contact</th>
              <th className="p-2 text-left">Queue</th>
              <th className="p-2 text-left">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}>
                <td className="p-2">
                  {view === "completed"
                    ? <span title={t.completed_at ?? ""}>[done]</span>
                    : <input type="checkbox" checked={!!selected[t.id]} onChange={(e) => setSelected((p) => ({ ...p, [t.id]: e.target.checked }))} aria-label={`Select ${t.title}`} />}
                </td>
                <td className="p-2 font-medium">{t.title}</td>
                <td className="p-2">{t.type}</td>
                <td className="p-2">{t.priority === "NONE" ? "-" : t.priority}</td>
                <td className="p-2">{t.due_at ? new Date(t.due_at).toLocaleString() : "-"}</td>
                <td className="p-2">{t.contact_name ?? "-"}</td>
                <td className="p-2">{t.queue_name ?? "-"}</td>
                <td className="p-2">{t.assignee_name ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && <CreateTaskModal queues={queues} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateTaskModal({ queues, onClose, onCreated }: { queues: Queue[]; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("TODO");
  const [priority, setPriority] = useState("NONE");
  const [dueAt, setDueAt] = useState("");
  const [queueId, setQueueId] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // HubSpot nicety: typing "call"/"email" in the title flips the type.
  const onTitle = (v: string) => {
    setTitle(v);
    const low = v.toLowerCase();
    if (low.includes("call")) setType("CALL");
    else if (low.includes("email")) setType("EMAIL");
    else if (low.includes("sms") || low.includes("text")) setType("SMS");
  };

  const save = () => {
    if (!title.trim()) { setErr("Title is required."); return; }
    api.post("/api/tasks", {
      title: title.trim(), type, priority, body: body.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      queue_id: queueId || null,
    }).then(onCreated).catch(() => setErr("Failed to create task."));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="border rounded-xl p-4 w-[420px]" style={{ background: "var(--ui-surface, #fff)", borderColor: "var(--ui-border)" }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--ui-text)" }}>Create task</h2>
        <label className="text-sm block mb-2" style={{ color: "var(--ui-text)" }}>Title
          <input value={title} onChange={(e) => onTitle(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Type
            <select value={type} onChange={(e) => setType(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Due
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
          </label>
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Queue
            <select value={queueId} onChange={(e) => setQueueId(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle}>
              <option value="">No queue</option>
              {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </label>
        </div>
        <label className="text-sm block mb-3" style={{ color: "var(--ui-text)" }}>Notes
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
        </label>
        {err && <p role="alert" style={{ color: "#dc2626" }}>{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="border rounded px-3 py-1.5 text-sm" style={inputStyle} onClick={onClose}>Cancel</button>
          <button className="border rounded px-3 py-1.5 text-sm font-semibold" style={inputStyle} onClick={save}>Create</button>
        </div>
      </div>
    </div>
  );
}
