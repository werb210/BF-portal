// BF_PORTAL_BLOCK_61_MAILBOX_ENGAGEMENT_TEMPLATES_UI_v1
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";

type Template = {
  id: string;
  name: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Draft = { name: string; subject: string; body_text: string; category: string; is_active: boolean };

const EMPTY_DRAFT: Draft = { name: "", subject: "", body_text: "", category: "", is_active: true };

export default function TemplatesTab() {
  const [items, setItems] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const r = await api<{ items: Template[] }>("/api/v1/bi/marketing/templates");
      setItems(r.items || []);
    } catch {
      setItems([]);
    }
  };
  useEffect(() => { void load(); }, []);

  const startNew = () => { setEditingId(null); setDraft(EMPTY_DRAFT); setShowForm(true); };
  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setDraft({ name: t.name, subject: t.subject || "", body_text: t.body_text || "", category: t.category || "", is_active: t.is_active });
    setShowForm(true);
  };
  const cancel = () => { setShowForm(false); setEditingId(null); setDraft(EMPTY_DRAFT); };

  const save = async () => {
    if (!draft.name.trim()) { toast.error("Name required"); return; }
    const body = { name: draft.name.trim(), subject: draft.subject || null, body_text: draft.body_text || null, category: draft.category || null, is_active: draft.is_active };
    try {
      if (editingId) {
        await api("/api/v1/bi/marketing/templates/" + encodeURIComponent(editingId), { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
        toast.success("Template updated");
      } else {
        await api("/api/v1/bi/marketing/templates", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
        toast.success("Template created");
      }
      cancel();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm("Delete template " + name + "?")) return;
    try {
      await api("/api/v1/bi/marketing/templates/" + encodeURIComponent(id), { method: "DELETE" });
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Email templates</h3>
        <button onClick={startNew} className="rounded bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 text-sm text-blue-200">New template</button>
      </div>

      {showForm && (
        <div className="bg-brand-bgAlt border border-card rounded-xl p-4 space-y-2">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Subject" className="w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
          <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category (optional)" className="w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
          <textarea value={draft.body_text} onChange={(e) => setDraft({ ...draft, body_text: e.target.value })} rows={8} placeholder="Body" className="w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm font-mono text-white" />
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <button onClick={() => void save()} className="rounded bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-sm text-emerald-200">{editingId ? "Update" : "Create"}</button>
            <button onClick={cancel} className="rounded border border-card px-3 py-1.5 text-sm text-white/70 hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id} className="bg-brand-surface border border-card rounded p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">
                {t.name}
                {!t.is_active && <span className="ml-2 text-[10px] uppercase tracking-wide text-white/40">inactive</span>}
              </div>
              <div className="text-[11px] text-white/50 truncate">{t.subject || "(no subject)"}{t.category ? " · " + t.category : ""}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(t)} className="text-xs text-blue-300 hover:text-blue-200">Edit</button>
              <button onClick={() => void remove(t.id, t.name)} className="text-xs text-red-300 hover:text-red-200">Delete</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-white/50 italic text-sm">No templates yet.</li>}
      </ul>
    </div>
  );
}
