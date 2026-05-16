// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type Sequence = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "archived";
  step_count: number;
  active_enrollments: number;
  updated_at: string;
};

type StepDraft = {
  type: "sms" | "email" | "task" | "wait";
  delay_seconds: number;
  subject?: string;
  body?: string;
  variant?: string;
};

export default function SequencesTab() {
  const [list, setList] = useState<Sequence[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await api<{ sequences: Sequence[] }>("/api/v1/bi/marketing/sequences");
      setList(r.sequences || []);
    } catch {
      setList([]);
    }
  };
  useEffect(() => { void load(); }, []);

  const act = async (id: string, action: "start" | "pause") => {
    setBusy(id);
    try {
      await api(`/api/v1/bi/marketing/sequences/${id}/${action}`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(null);
    }
  };

  const statusClass = (s: Sequence["status"]) =>
    s === "active"   ? "bg-emerald-500/20 text-emerald-200" :
    s === "paused"   ? "bg-amber-500/20 text-amber-200" :
    s === "archived" ? "bg-slate-500/20 text-slate-300" :
                       "bg-sky-500/20 text-sky-200";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Sequences</h3>
        <button onClick={() => setShowCreate(true)} className="rounded bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 text-sm text-blue-200">+ New sequence</button>
      </div>
      {list.length === 0 && <p className="text-white/50 italic">No sequences yet.</p>}
      <ul className="space-y-2">
        {list.map((s) => (
          <li key={s.id} className="bg-brand-bgAlt border border-card rounded-xl p-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-white">{s.name}</strong>
                  <span className={"rounded px-2 py-0.5 text-[10px] " + statusClass(s.status)}>{s.status}</span>
                </div>
                {s.description && <p className="text-xs text-white/60 mt-1">{s.description}</p>}
                <div className="text-[11px] text-white/40 mt-2">
                  {s.step_count} step{s.step_count === 1 ? "" : "s"} {String.fromCharCode(8226)} {s.active_enrollments} active {String.fromCharCode(8226)} updated {new Date(s.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                {s.status !== "active" && (
                  <button disabled={busy === s.id} onClick={() => void act(s.id, "start")} className="rounded bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs text-emerald-200">Start</button>
                )}
                {s.status === "active" && (
                  <button disabled={busy === s.id} onClick={() => void act(s.id, "pause")} className="rounded bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-xs text-amber-200">Pause</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {showCreate && <SequenceCreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} />}
    </div>
  );
}

function SequenceCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pauseOnReply, setPauseOnReply] = useState(true);
  const [steps, setSteps] = useState<StepDraft[]>([{ type: "sms", delay_seconds: 0, body: "" }]);
  const [busy, setBusy] = useState(false);

  const setStep = (i: number, patch: Partial<StepDraft>) =>
    setSteps((arr) => arr.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const removeStep = (i: number) => setSteps((arr) => arr.filter((_, idx) => idx !== i));
  const addStep = () => setSteps((arr) => [...arr, { type: "sms", delay_seconds: 86400, body: "" }]);

  const save = async () => {
    if (!name.trim()) { alert("Name required"); return; }
    setBusy(true);
    try {
      await api("/api/v1/bi/marketing/sequences", {
        method: "POST",
        body: JSON.stringify({ name, description: description || null, status: "draft", pause_on_reply: pauseOnReply, steps }),
      });
      onCreated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-brand-bg border border-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold mb-4">New sequence</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-white/60">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
          </label>
          <label className="block">
            <span className="text-xs text-white/60">Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pauseOnReply} onChange={(e) => setPauseOnReply(e.target.checked)} />
            <span className="text-white/80">Pause enrollment when contact replies</span>
          </label>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Steps</h4>
              <button onClick={addStep} className="text-xs text-blue-300 hover:text-blue-200">+ Add step</button>
            </div>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="bg-brand-bgAlt border border-card rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-white/60">Step {i + 1}</strong>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-xs text-rose-300 hover:text-rose-200">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block col-span-1">
                      <span className="text-[10px] text-white/50">Type</span>
                      <select value={s.type} onChange={(e) => setStep(i, { type: e.target.value as StepDraft["type"] })} className="mt-1 w-full rounded border border-card bg-brand-surface px-2 py-1 text-xs text-white">
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="task">Task</option>
                        <option value="wait">Wait</option>
                      </select>
                    </label>
                    <label className="block col-span-2">
                      <span className="text-[10px] text-white/50">Delay (seconds from prior step)</span>
                      <input type="number" min={0} value={s.delay_seconds} onChange={(e) => setStep(i, { delay_seconds: Number(e.target.value) || 0 })} className="mt-1 w-full rounded border border-card bg-brand-surface px-2 py-1 text-xs text-white" />
                    </label>
                  </div>
                  {s.type === "email" && (
                    <label className="block">
                      <span className="text-[10px] text-white/50">Subject</span>
                      <input value={s.subject ?? ""} onChange={(e) => setStep(i, { subject: e.target.value })} className="mt-1 w-full rounded border border-card bg-brand-surface px-2 py-1 text-xs text-white" />
                    </label>
                  )}
                  {(s.type === "sms" || s.type === "email" || s.type === "task") && (
                    <label className="block">
                      <span className="text-[10px] text-white/50">{s.type === "task" ? "Task description" : "Body"}</span>
                      <textarea value={s.body ?? ""} onChange={(e) => setStep(i, { body: e.target.value })} rows={3} className="mt-1 w-full rounded border border-card bg-brand-surface px-2 py-1 text-xs text-white" />
                    </label>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-card px-3 py-1.5 text-sm text-white/70 hover:text-white">Cancel</button>
          <button disabled={busy} onClick={() => void save()} className="rounded bg-blue-500/30 hover:bg-blue-500/40 px-4 py-1.5 text-sm text-blue-200">{busy ? "Saving..." : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
