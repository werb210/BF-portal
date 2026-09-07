// BF_PORTAL_AUTOMATIONS_UI_v1 - build/manage "when X happens, do Y" rules.
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

type Action = { type: string; title?: string; dueDays?: number; body?: string };
type Rule = { id: string; name: string; trigger_type: string; conditions: Record<string, unknown>; actions: Action[]; enabled: boolean };

export default function AutomationsPage(): JSX.Element {
  const [rules, setRules] = useState<Rule[]>([]);
  const [name, setName] = useState("");
  const [toStage, setToStage] = useState("");
  const [actionType, setActionType] = useState<"create_task" | "add_note">("create_task");
  const [taskTitle, setTaskTitle] = useState("");
  const [dueDays, setDueDays] = useState("2");
  const [noteBody, setNoteBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<Rule[] | { data?: Rule[] }>("/api/automations");
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setRules(Array.isArray(list) ? list : []);
    } catch { setRules([]); }
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    if (!name.trim()) { setMsg("Name is required"); return; }
    const conditions: Record<string, unknown> = toStage.trim() ? { toStage: toStage.trim() } : {};
    const action: Action = actionType === "create_task"
      ? { type: "create_task", title: taskTitle.trim() || "Follow up", dueDays: Number(dueDays) || 1 }
      : { type: "add_note", body: noteBody.trim() };
    try {
      await api.post("/api/automations", { name: name.trim(), trigger_type: "application.stage_changed", conditions, actions: [action] });
      setName(""); setToStage(""); setTaskTitle(""); setNoteBody(""); setMsg("Saved");
      void load();
    } catch { setMsg("Could not save the rule"); }
    setTimeout(() => setMsg(null), 2500);
  }
  async function toggle(r: Rule) { try { await api.patch(`/api/automations/${r.id}`, { enabled: !r.enabled }); void load(); } catch { /* ignore */ } }
  async function del(r: Rule) { if (!window.confirm(`Delete "${r.name}"?`)) return; try { await api.delete(`/api/automations/${r.id}`); void load(); } catch { /* ignore */ } }

  function summarize(r: Rule): string {
    const cond = r.conditions?.toStage ? `stage becomes "${String(r.conditions.toStage)}"` : "any stage change";
    const acts = (r.actions ?? []).map((a) => a.type === "create_task" ? `create task "${a.title ?? "Follow up"}"` : a.type === "add_note" ? "add a note" : a.type).join(", ");
    return `When ${cond} → ${acts || "do nothing"}`;
  }

  const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 8, padding: 16, marginBottom: 12, background: "var(--ui-surface-strong)" };
  const input: CSSProperties = { padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
  const label: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)", display: "block", marginBottom: 4 };

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Automations</h1>
      <p style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 20 }}>Run actions automatically when an application's stage changes.</p>

      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>New rule</div>
        <div style={{ display: "grid", gap: 12 }}>
          <div><label style={label}>Rule name</label><input style={{ ...input, width: "100%" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome package on approval" /></div>
          <div><label style={label}>When stage becomes (blank = any change)</label><input style={{ ...input, width: "100%" }} value={toStage} onChange={(e) => setToStage(e.target.value)} placeholder="e.g. Accepted" /></div>
          <div>
            <label style={label}>Then</label>
            <select style={{ ...input, marginRight: 8 }} value={actionType} onChange={(e) => setActionType(e.target.value as "create_task" | "add_note")}>
              <option value="create_task">Create a task</option>
              <option value="add_note">Add a note</option>
            </select>
            {actionType === "create_task" ? (
              <>
                <input style={{ ...input, marginRight: 8 }} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
                <input style={{ ...input, width: 80 }} type="number" value={dueDays} onChange={(e) => setDueDays(e.target.value)} placeholder="Due days" />
              </>
            ) : (
              <input style={{ ...input, width: 360 }} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Note text" />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={create} style={{ ...input, cursor: "pointer", fontWeight: 600 }}>Save rule</button>
            {msg ? <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{msg}</span> : null}
          </div>
        </div>
      </div>

      <div style={{ fontWeight: 600, margin: "20px 0 8px" }}>Active rules</div>
      {rules.length === 0 ? <div style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No rules yet.</div> : rules.map((r) => (
        <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{summarize(r)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, whiteSpace: "nowrap" }}>
            <button type="button" onClick={() => toggle(r)} style={{ ...input, cursor: "pointer" }}>{r.enabled ? "Enabled" : "Disabled"}</button>
            <button type="button" onClick={() => del(r)} style={{ ...input, cursor: "pointer", color: "var(--ui-danger, #b91c1c)" }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
