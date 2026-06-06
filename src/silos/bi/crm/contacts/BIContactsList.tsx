// BF_PORTAL_BLOCK_v664_BI_CONTACTS_BULK
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";

type SortCol = "name" | "company_name" | "lead_status" | "owner_name" | "created_at";

type BIContactRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  outreach_status: string | null;
  outreach_owner_id: string | null;
  tags: string[] | null;
  created_at: string;
};

export default function BIContactsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState<BIContactRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | null>(null);
  const [crmPage, setCrmPage] = useState(1); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1
  const [hasNext, setHasNext] = useState(false); // BF_PORTAL_BLOCK_v697_CRM_PAGER_FIX_v1

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null); setLoadFailed(false);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        params.set("sort", `${sort.col}:${sort.dir}`);
        params.set("page", String(crmPage)); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1
        params.set("pageSize", "100");
        const r: any = await api(`/api/v1/bi/crm/contacts${params.toString() ? `?${params}` : ""}`);
        const list: BIContactRow[] = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : Array.isArray(r?.data) ? r.data : [];
        if (!cancelled) { setRows(list); setHasNext(list.length >= 100); } // BF_PORTAL_BLOCK_v697_CRM_PAGER_FIX_v1
      } catch (e: any) {
        if (!cancelled) { setErr(`Could not load contacts. Please refresh. (${e?.message ?? "unknown_error"})`); setLoadFailed(true); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [q, sort.col, sort.dir, refreshKey, crmPage]); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1

  const onSort = (col: SortCol) => setSort((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
  const sortIndicator = (col: SortCol) => (sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "");

  function toggleSel(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function massDelete() {
    if (!isAdmin || selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} contact(s)? This cannot be undone.`)) return;
    setBusyMass("delete");
    try {
      await api(`/api/v1/bi/crm/contacts/bulk-delete`, { method: "POST", body: { ids: Array.from(selected) } } as any);
      setSelected(new Set()); setRefreshKey((k) => k + 1);
    } catch (e: any) { window.alert(`Mass delete failed: ${e?.message ?? String(e)}`); }
    finally { setBusyMass(null); }
  }
  async function massTag(tag: string) { // BF_PORTAL_BLOCK_v745_TAG_PRESET_PULLDOWN
    if (!isAdmin || selected.size === 0 || !tag) return;
    setBusyMass("tag");
    try {
      await api(`/api/v1/bi/crm/contacts/bulk-tag`, { method: "POST", body: { ids: Array.from(selected), tag } } as any);
      setSelected(new Set()); setRefreshKey((k) => k + 1);
    } catch (e: any) { window.alert(`Mass tag failed: ${e?.message ?? String(e)}`); }
    finally { setBusyMass(null); }
  }

  const tableRows = useMemo(() => rows.map((r) => (
    <tr key={r.id} style={trStyle} data-testid="bi-contact-row">
      {isAdmin && (
        <td style={{ padding: "8px 0", textAlign: "center" }}>
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
        </td>
      )}
      <td style={tdStyle}><Link to={`/silo/bi/crm/contacts/${r.id}`} style={linkStyle}>{r.full_name || "(no name)"}</Link></td>
      <td style={tdStyle}>{r.company_name ?? "—"}</td>
      <td style={tdStyle}>{r.tags && r.tags.length ? (<span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>{r.tags.map((t) => (<span key={t} style={tagChip}>{t}</span>))}</span>) : "—"}</td>{/* BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1 */}
      <td style={tdStyle}>{r.outreach_status ? r.outreach_status.replace(/_/g, " ") : "—"}</td>
      <td style={tdStyle}>{r.outreach_owner_id ?? "—"}</td>
      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
    </tr>
  )), [rows, isAdmin, selected]);

  const colCount = isAdmin ? 7 : 6; // BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1 (+Tags col)

  return (
    <div style={page} data-testid="bi-contacts-list">
      <div style={toolbar}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" style={searchInput} aria-label="Search contacts" />
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 10px", whiteSpace: "nowrap" }} aria-live="polite">{rows.length} {rows.length === 1 ? "record" : "records"}</div>
        <span style={{ flex: 1 }} />
      </div>

      {isAdmin && selected.size > 0 && (
        <div style={massBar}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
          <button disabled={busyMass !== null} onClick={massDelete} style={delBtn}>{busyMass === "delete" ? "Deleting…" : "Delete"}</button>
          {/* BF_PORTAL_BLOCK_v745_TAG_PRESET_PULLDOWN — preset "Tag as" pulldown; applies on select */}
          <select value="" disabled={busyMass !== null} onChange={(e) => { const v = e.target.value; if (v) void massTag(v); }} style={tagBox}>
            <option value="">{busyMass === "tag" ? "Tagging…" : "Tag as…"}</option>
            <option value="lender">Lender</option>
            <option value="broker">Broker</option>
            <option value="lawyer">Lawyer</option>
            <option value="bookkeeper">Account/Book Keeper</option>
            <option value="referrer">Referrer</option>
          </select>
          <button onClick={() => setSelected(new Set())} style={clearBtn}>Clear</button>
        </div>
      )}

      {/* BF_PORTAL_BLOCK_v698_CRM_PAGER_TOP_v1 — top pager */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>Page {crmPage}</span>
        <button type="button" disabled={crmPage <= 1} onClick={() => setCrmPage((p) => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: crmPage <= 1 ? "#f1f5f9" : "#fff", color: "#1d4ed8", fontWeight: 600, cursor: crmPage <= 1 ? "default" : "pointer" }}>Prev</button>
        <button type="button" disabled={!hasNext} onClick={() => setCrmPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: !hasNext ? "#f1f5f9" : "#fff", color: "#1d4ed8", fontWeight: 600, cursor: !hasNext ? "default" : "pointer" }}>Next</button>
      </div>
      <table style={table}>
        <thead>
          <tr style={theadRow}>
            {isAdmin && (
              <th style={{ width: 32, padding: "8px 0" }}>
                <input type="checkbox" checked={selected.size > 0 && rows.length > 0 && rows.every((c) => selected.has(c.id))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((c) => c.id)) : new Set())} />
              </th>
            )}
            <Th onClick={() => onSort("name")}>Name{sortIndicator("name")}</Th>
            <Th onClick={() => onSort("company_name")}>Company{sortIndicator("company_name")}</Th>
            <th style={thStyle}>Tags</th>{/* BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1 */}
            <Th onClick={() => onSort("lead_status")}>Lead status{sortIndicator("lead_status")}</Th>
            <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={colCount} style={emptyCell}>Loading…</td></tr>}
          {loadFailed && <tr><td colSpan={colCount} style={{ ...emptyCell, color: "#b00020" }}>{err ?? "Could not load contacts. Please refresh."}</td></tr>}
          {!loading && !loadFailed && rows.length === 0 && <tr><td colSpan={colCount} style={emptyCell}>No BI contacts yet.</td></tr>}
          {!loading && !loadFailed && tableRows}
        </tbody>
      </table>
      {/* BF_PORTAL_BLOCK_v696_CRM_PAGER_v1 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>Page {crmPage}</span>
        <button type="button" disabled={crmPage <= 1} onClick={() => setCrmPage((p) => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: crmPage <= 1 ? "#f1f5f9" : "#fff", color: "#1d4ed8", fontWeight: 600, cursor: crmPage <= 1 ? "default" : "pointer" }}>Prev</button>
        <button type="button" disabled={!hasNext} onClick={() => setCrmPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: !hasNext ? "#f1f5f9" : "#fff", color: "#1d4ed8", fontWeight: 600, cursor: !hasNext ? "default" : "pointer" }}>Next</button>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <th onClick={onClick} style={thStyle}>{children}</th>;
}

const page: CSSProperties = { background: "#fff", color: "#000", padding: 24, borderRadius: 8 };
const toolbar: CSSProperties = { display: "flex", gap: 12, marginBottom: 16, alignItems: "center" };
const searchInput: CSSProperties = { flex: 1, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4, background: "#fff", color: "#000" };
const massBar: CSSProperties = { display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" };
const delBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 };
const tagBox: CSSProperties = { padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 };
const clearBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: 13 };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fff" };
const theadRow: CSSProperties = { borderBottom: "1px solid #cbd6e2", background: "#f5f8fa" };
const thStyle: CSSProperties = { padding: 12, textAlign: "left", cursor: "pointer", color: "#33475b", textTransform: "uppercase", fontSize: 12, userSelect: "none" };
const tdStyle: CSSProperties = { padding: 12, color: "#000" };
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
const tagChip: CSSProperties = { display: "inline-block", fontSize: 11, color: "#1e293b", background: "#e2e8f0", borderRadius: 10, padding: "1px 8px" }; // BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1
