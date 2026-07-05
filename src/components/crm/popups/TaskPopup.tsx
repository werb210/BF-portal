import { useEffect, useState } from "react";
import { fetchUsers } from "@/api/settings";
import type { AdminUser } from "@/state/settings.store";
import { PopupShell, popupInputStyle } from "./PopupShell";
import { type Scope } from "@/api/crm";
import { api } from "@/api";

// BF_PORTAL_TASKS_UNIFY_v1 - the CRM record Task popup now writes to the unified
// /api/tasks backend (same as the Calendar panel + the runner), with the
// contact auto-attached from the record we are on (scope.id) - no picker, since
// you are already on the contact. SMS is a first-class type. Old tasks created
// via the previous /api/crm/contacts/{id}/tasks endpoint are left as-is; only
// new ones flow into /api/tasks so they appear in runs.
type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH";
type TaskType = "TODO" | "CALL" | "EMAIL" | "SMS";
const TYPE_LABEL: Record<TaskType, string> = { TODO: "To-do", CALL: "Call", EMAIL: "Email", SMS: "SMS" };

export function TaskPopup({ scope, onClose, onCreated }: {
  scope: Scope; onClose: () => void; onCreated: () => void;
}): JSX.Element {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("NONE");
  const [taskType, setTaskType] = useState<TaskType>("TODO");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  useEffect(() => {
    let alive = true;
    fetchUsers().then((u) => { if (alive) setUsers(Array.isArray(u) ? u : []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const contactId = scope.kind === "contact" ? scope.id : null;
  const companyId = scope.kind === "company" ? scope.id : null;
  const needsContact = taskType === "CALL" || taskType === "EMAIL" || taskType === "SMS";

  async function save(): Promise<void> {
    if (!title.trim()) { setErr("Please enter a task title."); return; }
    if (needsContact && !contactId) { setErr("Call, Email, and SMS tasks must be created from a contact record."); return; }
    setSaving(true); setErr(null);
    try {
      await api.post("/api/tasks", {
        title: title.trim(),
        type: taskType,
        priority,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        assignee_user_id: assignedTo || null,
        contact_id: contactId,
        company_id: companyId,
        body: notes.trim() || null,
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
      primaryAction={{ label: saving ? "Creating..." : "Create", disabled: !title.trim() || saving, onClick: save }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your task" style={{ ...popupInputStyle, marginBottom: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={popupInputStyle} />
        <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} style={popupInputStyle}>
          {(Object.keys(TYPE_LABEL) as TaskType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={popupInputStyle}>
          <option value="NONE">No priority</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
        </select>
      </div>
      <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ ...popupInputStyle, marginBottom: 8 }}>
        <option value="">Assign to... (unassigned)</option>
        {users.map((u) => (<option key={u.id} value={u.id}>{u.name || [u.firstName || u.first_name, u.lastName || u.last_name].filter(Boolean).join(" ") || u.email}</option>))}
      </select>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Notes..." style={popupInputStyle} />
      {scope.kind === "contact" ? (
        <p style={{ color: "#7c98b6", fontSize: 12, marginTop: 8 }}>Attached to this contact. Call, Email, and SMS tasks appear in your task runner.</p>
      ) : (
        <p style={{ color: "#7c98b6", fontSize: 12, marginTop: 8 }}>Attached to this company. Use a contact record for Call, Email, or SMS tasks.</p>
      )}
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </PopupShell>
  );
}
