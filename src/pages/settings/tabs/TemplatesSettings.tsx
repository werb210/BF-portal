// BF_PORTAL_BLOCK_v694_COMMS — reusable O365 compose templates settings.
import { useEffect, useState } from "react";
import { api } from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getErrorMessage } from "@/utils/errors";

type Template = {
  id: string;
  name: string;
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  category?: string | null;
  is_active?: boolean | null;
};

type TemplateDraft = {
  name: string;
  subject: string;
  body_text: string;
  category: string;
  is_active: boolean;
};

const EMPTY_DRAFT: TemplateDraft = {
  name: "",
  subject: "",
  body_text: "",
  category: "",
  is_active: true,
};

function normalizeTemplates(value: unknown): Template[] {
  const maybeItems = value && typeof value === "object" && "items" in value ? (value as { items?: unknown }).items : value;
  return Array.isArray(maybeItems)
    ? maybeItems.filter((item): item is Template => Boolean(item && typeof item === "object" && typeof (item as Template).id === "string"))
    : [];
}

export default function TemplatesSettings() {
  const [items, setItems] = useState<Template[]>([]);
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await api<unknown>("/api/o365/templates");
      setItems(normalizeTemplates(response));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load email templates."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(template: Template) {
    setEditingId(template.id);
    setDraft({
      name: template.name ?? "",
      subject: template.subject ?? "",
      body_text: template.body_text ?? template.body_html ?? "",
      category: template.category ?? "",
      is_active: template.is_active !== false,
    });
    setStatus(null);
    setError(null);
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("Template name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    const payload = {
      name: draft.name.trim(),
      subject: draft.subject.trim() || null,
      body_text: draft.body_text,
      category: draft.category.trim() || null,
      is_active: draft.is_active,
    };
    try {
      if (editingId) {
        await api.patch(`/api/o365/templates/${encodeURIComponent(editingId)}`, payload);
        setStatus("Template updated.");
      } else {
        await api.post("/api/o365/templates", payload);
        setStatus("Template created.");
      }
      resetDraft();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save template."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(template: Template) {
    if (!window.confirm(`Delete template ${template.name}?`)) return;
    setError(null);
    setStatus(null);
    try {
      await api.delete(`/api/o365/templates/${encodeURIComponent(template.id)}`);
      setStatus("Template deleted.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete template."));
    }
  }

  return (
    <section className="settings-panel" aria-label="Email template settings">
      <header>
        <h2>Email templates</h2>
        <p>Create reusable subject/body snippets for the Microsoft 365 composer.</p>
      </header>
      {error && <ErrorBanner message={error} />}
      {status && <p role="status" style={{ color: "#0d9b6c", fontSize: 13 }}>{status}</p>}

      <div className="settings-grid" style={{ alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{editingId ? "Edit template" : "New template"}</h3>
          <input aria-label="Template name" placeholder="Template name" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4 }} />
          <input aria-label="Template category" placeholder="Category (optional)" value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4 }} />
          <input aria-label="Template subject" placeholder="Subject" value={draft.subject} onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4 }} />
          <textarea aria-label="Template body" placeholder="Body" rows={10} value={draft.body_text} onChange={(e) => setDraft((prev) => ({ ...prev, body_text: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontFamily: "inherit" }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((prev) => ({ ...prev, is_active: e.target.checked }))} />
            Active in composer
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : editingId ? "Update template" : "Create template"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={resetDraft} disabled={saving}>Cancel edit</Button>}
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Saved templates</h3>
          {loading ? (
            <p>Loading templates…</p>
          ) : items.length === 0 ? (
            <p style={{ color: "#64748b" }}>No templates yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((template) => (
                <li key={template.id} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{template.name}</strong>
                    {template.is_active === false && <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 11 }}>inactive</span>}
                    <div style={{ color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{template.subject || "(no subject)"}{template.category ? ` · ${template.category}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Button type="button" variant="secondary" onClick={() => startEdit(template)}>Edit</Button>
                    <Button type="button" variant="ghost" onClick={() => void remove(template)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
