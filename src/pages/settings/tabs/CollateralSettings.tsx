// BF_PORTAL_BLOCK_v694_COMMS — reusable collateral library for O365 compose.
import { useEffect, useState } from "react";
import { api } from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getErrorMessage } from "@/utils/errors";

type Collateral = {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  is_active?: boolean | null;
};

type Draft = {
  name: string;
  url: string;
  description: string;
  is_active: boolean;
};

const EMPTY_DRAFT: Draft = { name: "", url: "", description: "", is_active: true };

function normalizeCollateral(value: unknown): Collateral[] {
  const maybeItems = value && typeof value === "object" && "items" in value ? (value as { items?: unknown }).items : value;
  return Array.isArray(maybeItems)
    ? maybeItems.filter((item): item is Collateral => Boolean(item && typeof item === "object" && typeof (item as Collateral).id === "string"))
    : [];
}

export default function CollateralSettings() {
  const [items, setItems] = useState<Collateral[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await api<unknown>("/api/o365/collateral");
      setItems(normalizeCollateral(response));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load collateral."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function startEdit(item: Collateral) {
    setEditingId(item.id);
    setDraft({
      name: item.name ?? "",
      url: item.url ?? "",
      description: item.description ?? "",
      is_active: item.is_active !== false,
    });
    setError(null);
    setStatus(null);
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("Collateral name is required.");
      return;
    }
    if (!draft.url.trim()) {
      setError("Collateral URL is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    const payload = {
      name: draft.name.trim(),
      url: draft.url.trim(),
      description: draft.description.trim() || null,
      is_active: draft.is_active,
    };
    try {
      if (editingId) {
        await api.patch(`/api/o365/collateral/${encodeURIComponent(editingId)}`, payload);
        setStatus("Collateral updated.");
      } else {
        await api.post("/api/o365/collateral", payload);
        setStatus("Collateral created.");
      }
      resetDraft();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save collateral."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Collateral) {
    if (!window.confirm(`Delete collateral ${item.name}?`)) return;
    setError(null);
    setStatus(null);
    try {
      await api.delete(`/api/o365/collateral/${encodeURIComponent(item.id)}`);
      setStatus("Collateral deleted.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete collateral."));
    }
  }

  return (
    <section className="settings-panel" aria-label="Collateral settings">
      <header>
        <h2>Collateral</h2>
        <p>Manage reusable links or hosted assets that can be attached to outbound emails.</p>
      </header>
      {error && <ErrorBanner message={error} />}
      {status && <p role="status" style={{ color: "#0d9b6c", fontSize: 13 }}>{status}</p>}

      <div className="settings-grid" style={{ alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{editingId ? "Edit collateral" : "New collateral"}</h3>
          <input aria-label="Collateral name" placeholder="Name" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4 }} />
          <input aria-label="Collateral URL" placeholder="https://…" value={draft.url} onChange={(e) => setDraft((prev) => ({ ...prev, url: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4 }} />
          <textarea aria-label="Collateral description" placeholder="Description (optional)" rows={5} value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} style={{ padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, fontFamily: "inherit" }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((prev) => ({ ...prev, is_active: e.target.checked }))} />
            Active in composer
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : editingId ? "Update collateral" : "Create collateral"}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={resetDraft} disabled={saving}>Cancel edit</Button>}
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Saved collateral</h3>
          {loading ? (
            <p>Loading collateral…</p>
          ) : items.length === 0 ? (
            <p style={{ color: "#64748b" }}>No collateral yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item) => (
                <li key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.name}</strong>
                    {item.is_active === false && <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 11 }}>inactive</span>}
                    <div style={{ color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.url}</div>
                    {item.description && <div style={{ color: "#64748b", fontSize: 12 }}>{item.description}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Button type="button" variant="secondary" onClick={() => startEdit(item)}>Edit</Button>
                    <Button type="button" variant="ghost" onClick={() => void remove(item)}>Delete</Button>
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
