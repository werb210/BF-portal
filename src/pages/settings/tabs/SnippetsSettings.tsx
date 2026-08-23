// BF_PORTAL_SNIPPETS_TAB_v46
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import api from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Snippet = {
  id: string;
  name: string;
  body_text: string | null;
  shortcut: string | null;
  shared: boolean;
  owner_user_id: string | null;
};

type Draft = Omit<Snippet, "id"> & { id?: string };

const EMPTY: Draft = {
  name: "",
  body_text: "",
  shortcut: "",
  shared: true,
  owner_user_id: null,
};

function cleanShortcut(raw: string): string {
  return raw.replace(/^#+/, "").replace(/[^a-z0-9_-]/gi, "").toLowerCase().slice(0, 40);
}

export default function SnippetsSettings() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await api.get<{ items?: Snippet[] } | Snippet[]>("/api/templates", {
        params: { snippets: 1 },
      });
      const list = Array.isArray(rows) ? rows : (rows?.items ?? []);
      setSnippets(list);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load snippets."));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ fields?: string[] }>("/api/templates/merge-fields");
        setFields(Array.isArray(res?.fields) ? res.fields : []);
      } catch {
        setFields([]);
      }
    })();
  }, []);

  function insertToken(token: string) {
    setEditing((prev) => {
      if (!prev) return prev;
      const el = bodyRef.current;
      const body = prev.body_text ?? "";
      if (!el) return { ...prev, body_text: body + token };
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? start;
      const next = body.slice(0, start) + token + body.slice(end);
      window.setTimeout(() => {
        try {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        } catch { /* unmounted */ }
      }, 0);
      return { ...prev, body_text: next };
    });
  }

  async function save() {
    if (!editing) return;
    const shortcut = cleanShortcut(editing.shortcut ?? "");
    if (!editing.name.trim()) { setError("Give the snippet a name."); return; }
    if (!shortcut) { setError("A snippet needs a shortcut - the word you type after #."); return; }
    if (!(editing.body_text ?? "").trim()) { setError("The snippet has no text."); return; }

    setSaving(true);
    setError(null);
    const payload = {
      channel: "message",
      name: editing.name.trim(),
      subject: "",
      body_html: null,
      body_text: editing.body_text ?? "",
      shared: editing.shared,
      is_snippet: true,
      shortcut,
    };
    try {
      if (editing.id) await api.put(`/api/templates/${editing.id}`, payload);
      else await api.post("/api/templates", payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/templates/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed."));
    }
  }

  const preview = cleanShortcut(editing?.shortcut ?? "") || "shortcut";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Snippets</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ui-text-muted)" }}>
          Reusable blocks of text you insert by typing <strong>#</strong> and a shortcut. Works in
          SMS, client messages and Team chat. For example, typing <strong>#pnw</strong> then a space
          could insert your personal net worth request.
        </p>
      </div>

      {error ? <div style={{ fontSize: 13, color: "var(--ui-accent-red)" }}>{error}</div> : null}

      {editing ? (
        <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--ui-border)", borderRadius: 8 }}>
          <label style={{ fontSize: 13 }}>
            Name<br />
            <Input value={editing.name} placeholder="Personal net worth request" onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label style={{ fontSize: 13 }}>
            Snippet text<br />
            <textarea
              ref={bodyRef}
              value={editing.body_text ?? ""}
              placeholder="Please fill in our personal net worth form in the client portal found here client.boreal.financial."
              onChange={(e) => setEditing({ ...editing, body_text: e.target.value })}
              rows={5}
              style={{ width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", fontSize: 14, fontFamily: "inherit" }}
            />
          </label>

          {fields.length > 0 ? (
            <label style={{ fontSize: 13 }}>
              Personalize<br />
              <select
                value=""
                onChange={(e) => {
                  const field = e.target.value;
                  e.target.value = "";
                  if (field) insertToken(`{{${field}}}`);
                }}
                style={{ padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", marginTop: 4 }}
              >
                <option value="">Insert a field…</option>
                {fields.map((field) => <option key={field} value={field}>{field}</option>)}
              </select>
              <span style={{ fontSize: 12, color: "var(--ui-text-muted)", marginLeft: 8 }}>
                Filled in from the contact when the snippet is used.
              </span>
            </label>
          ) : null}

          <label style={{ fontSize: 13 }}>
            Shortcut<br />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 18, color: "var(--ui-text-muted)" }}>#</span>
              <Input value={editing.shortcut ?? ""} placeholder="pnw" onChange={(e) => setEditing({ ...editing, shortcut: cleanShortcut(e.target.value) })} />
            </div>
            <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
              Type <strong>#{preview}</strong> then a space in any message box to insert this text.
            </span>
          </label>

          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={editing.shared} onChange={(e) => setEditing({ ...editing, shared: e.target.checked })} />
            Shared with all staff (uncheck to keep personal)
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save snippet"}</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditing(null); setError(null); }}>Cancel</Button>
          </div>
        </div>
      ) : <Button type="button" onClick={() => setEditing({ ...EMPTY })}>New snippet</Button>}

      {loaded && snippets.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No snippets yet.</p> : null}

      <div style={{ display: "grid", gap: 8 }}>
        {snippets.map((snippet) => (
          <div key={snippet.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--ui-border)", borderRadius: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{snippet.name}</strong>
                {snippet.shortcut ? <code style={{ marginLeft: 8, fontSize: 13, color: "var(--ui-text-muted)" }}>#{snippet.shortcut}</code> : null}
                <span style={{ marginLeft: 8, fontSize: 12, color: "var(--ui-text-muted)" }}>{snippet.shared ? "shared" : "personal"}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ui-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{snippet.body_text}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Button type="button" variant="secondary" onClick={() => setEditing({ id: snippet.id, name: snippet.name, body_text: snippet.body_text ?? "", shortcut: snippet.shortcut ?? "", shared: snippet.shared, owner_user_id: snippet.owner_user_id })}>Edit</Button>
              <Button type="button" variant="secondary" onClick={() => void remove(snippet.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
