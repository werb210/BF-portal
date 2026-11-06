import { useEffect, useState } from "react";
import { api } from "@/api";

// BF_PORTAL_CRM_SEGMENTS_v1 - save the current contact-list filters as a named
// segment, re-apply a saved one, or delete one. Filters are opaque jsonb.
type Filters = Record<string, unknown>;
type Segment = { id: string; name: string; filters: Filters };

// BF_PORTAL_v907_SEGMENT_RESET - the first option is "All contacts" (or allLabel): choosing it applies empty filters, so
// the list goes back to everything. The page treats any filter a segment does not set as the default.
export function CrmSegmentBar({ current, onApply, allLabel = "All records" }: { current: Filters; onApply: (f: Filters) => void; allLabel?: string }) {
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
    if (!id) { onApply({}); return; }
    const seg = segments.find((s) => s.id === id);
    if (seg) onApply(seg.filters && typeof seg.filters === "object" ? seg.filters : {});
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
  async function del() {
    if (!selectedId) return;
    const seg = segments.find((s) => s.id === selectedId);
    if (!window.confirm(`Delete segment "${seg?.name ?? ""}"?`)) return;
    try {
      await api.delete(`/api/crm/segments/${selectedId}`);
      setSelectedId("");
      setMsg("Deleted");
      void load();
    } catch {
      setMsg("Delete failed");
    }
    setTimeout(() => setMsg(null), 2000);
  }
  const ctl: React.CSSProperties = { padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select value={selectedId} onChange={(e) => apply(e.target.value)} style={ctl} aria-label="Segments">
        <option value="">{allLabel}</option>
        {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="button" onClick={save} style={{ ...ctl, cursor: "pointer" }}>Save segment</button>
      {selectedId ? (
        <>
          <button type="button" onClick={() => apply("")} style={{ ...ctl, cursor: "pointer" }} data-testid="segment-clear">Show {allLabel.toLowerCase()}</button>
          <button type="button" onClick={del} style={{ ...ctl, cursor: "pointer" }} aria-label="Delete segment">Delete</button>
        </>
      ) : null}
      {msg ? <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{msg}</span> : null}
    </div>
  );
}

export default CrmSegmentBar;
