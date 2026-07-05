// BF_PORTAL_TASKS_M2_M3_v1 - Manage queues (Milestone 2): create, rename,
// delete (label-only - tasks survive, per spec), PRIVATE/SHARED toggle, and
// a shares editor for shared queues (staff picked via /api/tasks/staff).
// Owner-only edits are enforced server-side; the UI surfaces failures.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

type Queue = { id: string; name: string; access_type: string; open_count: number };
type Staff = { id: string; name: string };
type Share = { user_id: string; name: string };

const box: React.CSSProperties = {
  background: "var(--ui-surface, #fff)", color: "var(--ui-text)", borderColor: "var(--ui-border)",
};
const input: React.CSSProperties = {
  background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderColor: "var(--ui-border)",
};

function unwrap<T>(r: unknown): T { return ((r as { data?: unknown })?.data ?? r) as T; }

export default function ManageQueuesModal({ onClose }: { onClose: () => void }) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [sharesFor, setSharesFor] = useState<string | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [shareUser, setShareUser] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.get<unknown>("/api/tasks/queues"), api.get<unknown>("/api/tasks/staff")])
      .then(([q, st]) => {
        setQueues(unwrap<{ queues: Queue[] }>(q).queues ?? []);
        setStaff(unwrap<{ staff: Staff[] }>(st).staff ?? []);
        setErr(null);
      })
      .catch(() => setErr("Failed to load queues."));
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadShares = (queueId: string) => {
    setSharesFor(queueId);
    api.get<unknown>(`/api/tasks/queues/${queueId}/shares`)
      .then((r) => setShares(unwrap<{ shares: Share[] }>(r).shares ?? []))
      .catch(() => setErr("Failed to load shares (owner only)."));
  };

  const create = () => {
    if (!newName.trim()) return;
    api.post("/api/tasks/queues", { name: newName.trim() })
      .then(() => { setNewName(""); load(); })
      .catch(() => setErr("Failed to create queue."));
  };

  const rename = (id: string) => {
    if (!editName.trim()) return;
    api.patch(`/api/tasks/queues/${id}`, { name: editName.trim() })
      .then(() => { setEditing(null); load(); })
      .catch(() => setErr("Rename failed (owner only)."));
  };

  const toggleAccess = (q: Queue) => {
    api.patch(`/api/tasks/queues/${q.id}`, { access_type: q.access_type === "SHARED" ? "PRIVATE" : "SHARED" })
      .then(load)
      .catch(() => setErr("Change failed (owner only)."));
  };

  const remove = (q: Queue) => {
    if (!window.confirm(`Delete queue "${q.name}"? Its ${q.open_count} tasks are kept - only the label is removed.`)) return;
    api.delete(`/api/tasks/queues/${q.id}`)
      .then(() => { if (sharesFor === q.id) setSharesFor(null); load(); })
      .catch(() => setErr("Delete failed (owner only)."));
  };

  const addShare = () => {
    if (!sharesFor || !shareUser) return;
    api.post(`/api/tasks/queues/${sharesFor}/shares`, { user_id: shareUser })
      .then(() => { setShareUser(""); loadShares(sharesFor); })
      .catch(() => setErr("Share failed."));
  };

  const removeShare = (userId: string) => {
    if (!sharesFor) return;
    api.delete(`/api/tasks/queues/${sharesFor}/shares/${userId}`)
      .then(() => loadShares(sharesFor))
      .catch(() => setErr("Unshare failed."));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center" }} data-testid="manage-queues">
      <div className="border rounded-xl p-4 w-[560px] max-w-[95vw] max-h-[85vh] overflow-auto" style={box}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Manage queues</h2>
          <button className="border rounded px-2 py-1 text-sm font-semibold" style={input} onClick={onClose}>X</button>
        </div>

        <div className="flex gap-2 mb-4">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New queue name"
            className="border rounded px-2 py-1 text-sm flex-1" style={input} />
          <button className="border rounded px-3 py-1 text-sm font-semibold" style={input} onClick={create}>Create queue</button>
        </div>

        {err && <p role="alert" style={{ color: "#dc2626" }}>{err}</p>}
        {queues.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No queues in this silo yet.</p>}

        {queues.map((q) => (
          <div key={q.id} className="border rounded-lg p-3 mb-2" style={{ borderColor: "var(--ui-border)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              {editing === q.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded px-2 py-1 text-sm" style={input} />
                  <button className="border rounded px-2 py-1 text-sm" style={input} onClick={() => rename(q.id)}>Save</button>
                  <button className="border rounded px-2 py-1 text-sm" style={input} onClick={() => setEditing(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <strong>{q.name}</strong>
                  <span className="text-sm" style={{ color: "var(--ui-text-muted)" }}>{q.open_count} open - {q.access_type}</span>
                  <div className="ml-auto flex gap-2">
                    <button className="border rounded px-2 py-1 text-sm" style={input} onClick={() => { setEditing(q.id); setEditName(q.name); }}>Rename</button>
                    <button className="border rounded px-2 py-1 text-sm" style={input} onClick={() => toggleAccess(q)}>
                      {q.access_type === "SHARED" ? "Make private" : "Make shared"}
                    </button>
                    {q.access_type === "SHARED" && (
                      <button className="border rounded px-2 py-1 text-sm" style={input} onClick={() => (sharesFor === q.id ? setSharesFor(null) : loadShares(q.id))}>
                        Shares
                      </button>
                    )}
                    <button className="border rounded px-2 py-1 text-sm" style={{ ...input, color: "#dc2626" }} onClick={() => remove(q)}>Delete</button>
                  </div>
                </>
              )}
            </div>

            {sharesFor === q.id && (
              <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--ui-border)" }}>
                <div className="flex gap-2 items-center mb-1">
                  <select value={shareUser} onChange={(e) => setShareUser(e.target.value)} className="border rounded px-2 py-1 text-sm" style={input}>
                    <option value="">Add staff...</option>
                    {staff.filter((u) => !shares.some((sh) => sh.user_id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button className="border rounded px-2 py-1 text-sm" style={input} onClick={addShare} disabled={!shareUser}>Add</button>
                </div>
                {shares.length === 0 && <p className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Not shared with anyone yet.</p>}
                {shares.map((sh) => (
                  <div key={sh.user_id} className="flex items-center gap-2 text-sm py-0.5">
                    <span>{sh.name}</span>
                    <button className="border rounded px-2 text-xs" style={input} onClick={() => removeShare(sh.user_id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
