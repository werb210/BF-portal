// BF_PORTAL_CRM_SAVED_VIEWS_v1 - one people list per business, many saved views on it ("Outreach", "Brokerages",
// "Call list"...). A view is a named set of the list's filters, shared with everyone in the business (BF-Server
// /api/crm/views, the business from X-Silo). Clicking a view applies it; "Save view" keeps the filters now on screen.
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

export type ViewFilters = { q?: string; tag?: string; ownerId?: string; marketing?: string; sortCol?: string; sortDir?: string; custom?: unknown[] };
export type SavedView = { id: string; name: string; filters: ViewFilters; created_by?: string | null };

const chip = (on: boolean): CSSProperties => ({
  padding: "4px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
  border: "1px solid var(--ui-border)", background: on ? "var(--accent, #1E3A8A)" : "var(--ui-surface)", color: on ? "#fff" : "var(--ui-text)",
});

export function sameFilters(a: ViewFilters, b: ViewFilters): boolean {
  const norm = (f: ViewFilters) => JSON.stringify({ q: f.q || "", tag: f.tag || "", ownerId: f.ownerId || "", marketing: f.marketing || "", custom: f.custom ?? [] });
  return norm(a) === norm(b);
}

export default function SavedViewsBar({ current, onApply, canRemove }: { current: ViewFilters; onApply: (f: ViewFilters) => void; canRemove: (v: SavedView) => boolean }) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<{ views?: SavedView[] }>("/api/crm/views")
    .then((r) => setViews(Array.isArray(r?.views) ? r.views : []))
    .catch(() => setViews([]));
  useEffect(() => { void load(); }, []);

  async function save() {
    const n = name.trim();
    if (!n) { setError("Give the view a name."); return; }
    try {
      await api.post("/api/crm/views", { name: n, filters: current });
      setNaming(false); setName(""); setError(null);
      await load();
    } catch { setError("Could not save the view."); }
  }
  async function remove(v: SavedView) {
    try { await api.delete(`/api/crm/views/${v.id}`); await load(); }
    catch { setError("Could not remove the view."); }
  }

  return (
    <div data-testid="crm-saved-views" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
      <button type="button" style={chip(sameFilters(current, {}))} onClick={() => onApply({})}>Everyone</button>
      {views.map((v) => (
        <span key={v.id} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <button type="button" style={chip(sameFilters(current, v.filters ?? {}))} onClick={() => onApply(v.filters ?? {})}>{v.name}</button>
          {canRemove(v) && <button type="button" aria-label={`Remove view ${v.name}`} title="Remove this view" onClick={() => void remove(v)}
            style={{ border: 0, background: "transparent", color: "var(--ui-text-muted)", cursor: "pointer", fontSize: 13, padding: "0 4px" }}>×</button>}
        </span>
      ))}
      {naming ? (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input autoFocus aria-label="View name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setNaming(false); }}
            placeholder="View name" style={{ padding: "3px 8px", fontSize: 12, borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)" }} />
          <button type="button" style={chip(false)} onClick={() => void save()}>Save</button>
          <button type="button" style={chip(false)} onClick={() => { setNaming(false); setError(null); }}>Cancel</button>
        </span>
      ) : (
        <button type="button" style={{ ...chip(false), borderStyle: "dashed" }} onClick={() => setNaming(true)}>+ Save view</button>
      )}
      {error && <span role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
