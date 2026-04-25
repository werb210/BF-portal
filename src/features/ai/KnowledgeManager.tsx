import { useEffect, useState } from "react";
import { api } from "@/api";
import Button from "@/components/ui/Button";

type KnowledgeDoc = {
  id: string;
  source_type: string;
  source_id: string | null;
  content: string;
  created_at: string;
};

export default function KnowledgeManager() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const r = await api<{ documents?: KnowledgeDoc[] }>("/api/settings/ai-knowledge");
      setDocs(r.documents ?? []);
    } catch {
      setError("Could not load knowledge entries.");
    }
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api("/api/settings/ai-knowledge", { method: "POST", body: fd });
      await load();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitText() {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/settings/ai-knowledge/text", { content, title: title.trim() });
      setText("");
      setTitle("");
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this entry from the knowledge base?")) return;
    try {
      await api(`/api/settings/ai-knowledge/${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Delete failed.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2>AI Knowledge Base</h2>
      {error && <div style={{ color: "#dc2626" }}>{error}</div>}

      <section>
        <h3>Upload a file</h3>
        <input
          type="file"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
          }}
        />
        <p style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
          Up to 5 MB. First ~200 KB of text is indexed.
        </p>
      </section>

      <section>
        <h3>Paste text</h3>
        <input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 6, marginBottom: 6 }}
        />
        <textarea
          placeholder="Paste reference content Maya should know about…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          style={{ width: "100%", padding: 6, fontFamily: "inherit" }}
        />
        <div style={{ marginTop: 6 }}>
          <Button onClick={() => void submitText()} disabled={busy || !text.trim()}>
            {busy ? "Saving…" : "Add entry"}
          </Button>
        </div>
      </section>

      <section>
        <h3>Indexed entries ({docs.length})</h3>
        {docs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No entries yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map((d) => (
              <li key={d.id} style={{ border: "1px solid var(--ui-border)", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        marginRight: 6,
                      }}
                    >
                      {d.source_type}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
                      {new Date(d.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => void remove(d.id)}
                    style={{
                      background: "transparent",
                      color: "#dc2626",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Remove
                  </button>
                </div>
                <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {d.content}
                  {d.content.length >= 240 ? "…" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
