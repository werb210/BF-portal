import { useEffect, useState } from "react";
import { api } from "@/api";

// BF_PORTAL_CRM_SEGMENTS_v1 - save the current contact-list filters as a named
// segment, and re-apply a saved one. Filters are opaque; the list re-applies them.
type Filters = Record<string, unknown>;
type Segment = { id: string; name: string; filters: Filters };

export function CrmSegmentBar({ current, onApply }: { current: Filters; onApply: (f: Filters) => void }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.get<Segment[] | { data?: Segment[] }>("/api/crm/segments");
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setSegments(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
  }
  useEffect(() => { void load(); }, []);

  function apply(id: string) {
    setSelectedId(id);
    const seg = segments.find((s) => s.id === id);
    if (seg && seg.filters) onApply(seg.filters);
  }
  async function save() {
    const name = window.prompt("Segment name?");
    if (!name || !name.trim()) return;
    try {
      await api.post("/api/crm/segments", { name: name.trim(), filters: current });
      setMsg("Saved");
      void load();
    } catch {
      setMsg("Save failed");
    }
    setTimeout(() => setMsg(null), 2000);
  }
  const ctl: React.CSSProperties = { padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select value={selectedId} onChange={(e) => apply(e.target.value)} style={ctl} aria-label="Segments">
        <option value="">Segments…</option>
        {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" onClick={save} style={{ ...ctl, cursor: "pointer" }}>Save segment</button>
      {msg ? <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{msg}</span> : null}
    </div>
  );
}

export default CrmSegmentBar;
