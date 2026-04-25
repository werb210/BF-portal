import { useState } from "react";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { crmApi, type Scope } from "@/api/crm";

type Priority = "none" | "low" | "normal" | "high";
type TaskType = "todo" | "call" | "email";

export function TaskPopup({ scope, onClose, onCreated }: {
  scope: Scope; onClose: () => void; onCreated: () => void;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [taskType, setTaskType] = useState<TaskType>("todo");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    setSaving(true); setErr(null);
    try {
      await crmApi.tasks.create(scope, {
        title,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
        task_type: taskType,
        notes,
      });
      onCreated();
      onClose();
    } catch (e) {
      setErr((e as Error)?.message ?? "Could not create the task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PopupShell
      title="Task"
      onClose={onClose}
      primaryAction={{ label: saving ? "Creating…" : "Create", disabled: !title.trim() || saving, onClick: save }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter your task"
        style={{ ...popupInputStyle, marginBottom: 8 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={popupInputStyle} />
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} style={popupInputStyle}>
          <option value="todo">To-do</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={popupInputStyle}>
          <option value="none">No priority</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
        placeholder="Notes…"
        style={popupInputStyle}
      />
      <p style={{ color: "#7c98b6", fontSize: 12, marginTop: 8 }}>
        Mirrored to your Microsoft 365 To-Do default list when M365 is connected.
      </p>
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
