// BI_PIPELINE_ALIGN_v57 — internal staff notes.
// BF_PORTAL_v789_BI_APP_NOTES - mounted as the Notes tab of the BI application detail, with an add-note
// box (POST {body} to /api/v1/bi/applications/:id/notes, BI-Server v789), loading and error states,
// and the author and date on each note.
import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { api } from "@/api";

type Note = { id: string; body: string; author_name: string | null; created_at: string };

function normalizeNotes(raw: unknown): Note[] {
  const r = raw as { notes?: unknown; data?: unknown } | unknown[] | null;
  const list: unknown[] = Array.isArray(r) ? r : Array.isArray(r?.notes) ? r.notes : Array.isArray(r?.data) ? r.data : [];
  return list
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n, i) => ({
      id: String(n.id ?? `note-${i}`),
      body: typeof n.body === "string" ? n.body : "",
      author_name: typeof n.author_name === "string" && n.author_name.trim() ? n.author_name : null,
      created_at: typeof n.created_at === "string" ? n.created_at : "",
    }));
}

export default function NotesTab({ applicationId }: { applicationId: string }) {
  const path = `/api/v1/bi/applications/${encodeURIComponent(applicationId)}/notes`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotes(normalizeNotes(await api(path)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notes.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void load(); }, [load]);

  async function add() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api(path, { method: "POST", body: { body } });
      setDraft("");
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...notes].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));

  return (
    <div data-testid="bi-app-notes" style={wrap}>
      <label htmlFor="bi-app-note-input" style={label}>Add a note</label>
      <textarea
        id="bi-app-note-input"
        spellCheck
        lang="en-CA"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder="Internal note for the team"
        style={input}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => void add()} disabled={!draft.trim() || saving} style={button}>
          {saving ? "Saving..." : "Add note"}
        </button>
        {saveError && <span role="alert" style={{ color: "var(--ui-text-danger)", fontSize: 13 }}>{saveError}</span>}
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && <div style={muted}>Loading notes...</div>}
        {!loading && error && <div role="alert" style={{ ...muted, color: "var(--ui-text-danger)" }}>{error}</div>}
        {!loading && !error && sorted.length === 0 && <div style={muted}>No notes yet.</div>}
        {!loading && !error && sorted.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sorted.map((n) => (
              <li key={n.id} data-testid="bi-app-note" style={noteRow}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <strong style={{ color: "var(--ui-text)", fontSize: 13 }}>{n.author_name ?? "Unknown author"}</strong>
                  <time style={muted} dateTime={n.created_at}>{n.created_at && !Number.isNaN(Date.parse(n.created_at)) ? new Date(n.created_at).toLocaleString() : ""}</time>
                </div>
                <div style={{ color: "var(--ui-text)", fontSize: 14, whiteSpace: "pre-wrap" }}>{n.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const wrap: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", border: "1px solid var(--ui-border-soft)", borderRadius: 8, padding: 16 };
const label: CSSProperties = { display: "block", fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 4 };
const input: CSSProperties = { width: "100%", padding: 8, border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-input)", color: "var(--ui-text)", fontSize: 14, fontFamily: "inherit" };
const button: CSSProperties = { border: "1px solid var(--ui-border)", background: "var(--ui-surface-muted)", color: "var(--ui-text)", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" };
const muted: CSSProperties = { color: "var(--ui-text-muted)", fontSize: 12 };
const noteRow: CSSProperties = { borderTop: "1px solid var(--ui-border-soft)", padding: "10px 0" };
