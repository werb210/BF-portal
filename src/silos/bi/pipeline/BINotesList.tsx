// BI_NOTES_UI_v47 — V1 BI application-card Notes tab.
import { useEffect, useState } from "react";
import { createBINote, deleteBINote, listBINotes, updateBINote, type BINote } from "../api/biNotes";

const MENTION_RE = /(^|[\s(])@([a-zA-Z0-9_.\-]{2,40})/g;

function renderBody(body: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) {
    const idx = m.index + (m[1] ? m[1].length : 0);
    if (idx > last) out.push(body.slice(last, idx));
    const mention = m[2] ?? "";
    out.push(
      <span key={`m-${idx}`} className="rounded bg-blue-500/20 px-1 text-blue-200">@{mention}</span>
    );
    last = idx + 1 + mention.length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

export default function BINotesList({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState<BINote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [applicationId]);

  async function load() {
    setLoading(true);
    try {
      const r = await listBINotes(applicationId);
      setNotes(r.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    const body = draft.trim();
    if (!body) return;
    try {
      await createBINote(applicationId, body);
      setDraft("");
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to add"); }
  }

  async function save(id: string) {
    const body = editingBody.trim();
    if (!body) return;
    try {
      await updateBINote(applicationId, id, body);
      setEditingId(null);
      setEditingBody("");
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to update"); }
  }

  async function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this note?")) return;
    try {
      await deleteBINote(applicationId, id);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to delete"); }
  }

  if (loading) return <div>Loading notes…</div>;

  return (
    <div className="space-y-3" data-testid="bi-notes-list">
      <div className="rounded-xl border border-card bg-brand-surface p-4">
        <textarea
          className="w-full rounded border border-card bg-brand-bgAlt p-2 text-sm"
          rows={3}
          placeholder="Add a note. Use @username to mention a teammate."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          data-testid="bi-note-draft"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="bg-brand-accent hover:bg-brand-accentHover rounded-full h-9 px-4 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void add()}
            disabled={!draft.trim()}
            data-testid="bi-note-add"
          >Add note</button>
        </div>
      </div>

      {err && <div className="text-sm text-red-300">{err}</div>}

      {notes.length === 0 ? (
        <p className="text-sm text-white/60">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-card bg-brand-surface p-3 text-sm" data-testid={`bi-note-${n.id}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                <span>{new Date(n.created_at).toLocaleString()}</span>
                <div className="flex gap-3">
                  <button type="button" className="hover:underline" onClick={() => { setEditingId(n.id); setEditingBody(n.body); }}>Edit</button>
                  <button type="button" className="text-red-300 hover:underline" onClick={() => void remove(n.id)}>Delete</button>
                </div>
              </div>
              {editingId === n.id ? (
                <div>
                  <textarea
                    className="w-full rounded border border-card bg-brand-bgAlt p-2 text-sm"
                    rows={3}
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="bg-brand-accent rounded-full h-8 px-3 text-xs text-white" onClick={() => void save(n.id)}>Save</button>
                    <button type="button" className="rounded-full h-8 px-3 text-xs border border-card" onClick={() => { setEditingId(null); setEditingBody(""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{renderBody(n.body)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
