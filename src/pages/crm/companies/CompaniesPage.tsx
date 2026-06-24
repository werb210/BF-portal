import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { crmApi, type CompanyRow } from "@/api/crm";
import { canDelete } from "@/auth/canDelete";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import CreateCompanyModal from "./CreateCompanyModal";
import CompaniesImportModal from "./CompaniesImportModal";
import ColumnsMenu from "@/components/crm/ColumnsMenu";
import { exportRowsToCsv } from "@/utils/csvExport";

type SortCol = "name" | "industry" | "owner_name" | "created_at";


export default function CompaniesPage() {
  const { silo } = useSilo();
  const { user } = useAuth();
  const showDelete = canDelete(user?.role as any);
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | "active" | "assign" | null>(null);
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]);
  const [ownerId, setOwnerId] = useState("");
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const toggleCol = (k: string) => setHiddenCols((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  void showDelete;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.listCompanies({
          silo: String(silo).toLowerCase(),
          q,
          owner_id: ownerId || undefined,
          tag: tagFilter || undefined,
          sort: `${sort.col}:${sort.dir}`,
        });
        if (!cancelled) setRows(Array.isArray(r) ? r : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load companies.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [silo, q, sort.col, sort.dir, refreshKey, ownerId, tagFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ users?: Array<{ id: string; first_name?: string; last_name?: string }> } | Array<{ id: string; first_name?: string; last_name?: string }>>("/api/users");
        const list = Array.isArray(r) ? r : (r?.users ?? []);
        if (!cancelled) setOwners(list);
      } catch { if (!cancelled) setOwners([]); }
    })();
    return () => { cancelled = true; };
  }, []);

  const onSort = (col: SortCol) =>
    setSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

  const sortIndicator = (col: SortCol) =>
    sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  async function massDelete() {
    if (!isAdmin || selected.size === 0) return;
    if (!window.confirm(`Hard-delete ${selected.size} company(ies)? This cannot be undone. Use only for Apollo imports.`)) return;
    setBusyMass("delete");
    try {
      await crmApi.bulkDeleteCompanies(Array.from(selected));
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Mass delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }
  async function massTag() {
    if (!isAdmin || selected.size === 0 || !tagInput.trim()) return;
    if (!window.confirm(`Apply tag "${tagInput.trim()}" to ${selected.size} company(ies)?`)) return;
    setBusyMass("tag");
    try {
      await crmApi.bulkTagCompanies(Array.from(selected), tagInput.trim());
      setSelected(new Set());
      setTagInput("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Mass tag failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }
  async function massTagActive() {
    if (!isAdmin || selected.size === 0) return;
    setBusyMass("active");
    try {
      await crmApi.bulkTagCompanies(Array.from(selected), "active");
      setSelected(new Set()); setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Tag Active failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }
  async function massAssign() {
    if (!isAdmin || selected.size === 0 || !assignOwnerId) return;
    setBusyMass("assign");
    try {
      await crmApi.bulkAssignCompanies(Array.from(selected), assignOwnerId);
      setSelected(new Set()); setAssignOwnerId(""); setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Assign failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }

  const tableRows = useMemo(() => rows.map(r => (
    <tr key={r.id} style={trStyle}>
      {isAdmin && (
        <td style={{ padding: "8px 0", textAlign: "center" }}>
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
        </td>
      )}
      <td style={tdStyle}>
        <Link to={`/crm/companies/${r.id}`} style={linkStyle}>{r.name}</Link>
      </td>
      {!hiddenCols.has("industry") && <td style={tdStyle}>{r.industry ?? "—"}</td>}
      {!hiddenCols.has("financing") && (
      <td style={tdStyle}>
        {(r.types_of_financing ?? []).map(t => (
          <span key={t} style={tag}>{t}</span>
        ))}
      </td>
      )}
      {!hiddenCols.has("owner_name") && <td style={tdStyle}>{r.owner_name ?? "—"}</td>}
      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
    </tr>
  )), [isAdmin, rows, selected, hiddenCols]);

  return (
    <div style={page}>
      <div style={toolbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies"
          style={searchInput}
        />
        <select data-testid="bf-companies-owner-filter" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} style={toolbarBtn} aria-label="Filter by owner">
          <option value="">All owners</option>
          {owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}
        </select>
        <select data-testid="bf-companies-tag-filter" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={toolbarBtn} aria-label="Filter by tag" title="Filter by tag">
          <option value="">All companies</option>
          <option value="active">Active only</option>
        </select>
        <button style={toolbarBtn} onClick={() => exportRowsToCsv("bf-companies.csv", rows as any)}>Export</button>
        <ColumnsMenu options={[{ key: "industry", label: "Industry" }, { key: "financing", label: "Types of financing" }, { key: "owner_name", label: "Owner" }]} hidden={hiddenCols} onToggle={toggleCol} style={toolbarBtn} />
        <button onClick={() => setImportOpen(true)} style={toolbarBtn}>Import</button>
        <button
          onClick={() => setCreateOpen(true)}
          style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0 }}
        >+ Create Company</button>
      </div>
      {isAdmin && selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
          <button disabled={busyMass !== null} onClick={massDelete} style={{ padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "delete" ? "Deleting…" : "Delete"}</button>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tag name" style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13 }} />
          <button disabled={busyMass !== null || !tagInput.trim()} onClick={massTag} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--ui-accent-blue)", color: "#fff", border: 0, cursor: tagInput.trim() ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "tag" ? "Tagging…" : "Apply tag"}</button>
          <button disabled={busyMass !== null} onClick={() => void massTagActive()} title='Tag selected companies as "active"' style={{ padding: "6px 12px", borderRadius: 6, background: "#16a34a", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "active" ? "Tagging…" : "Tag Active"}</button>
          <select value={assignOwnerId} onChange={(e) => setAssignOwnerId(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)" }}><option value="">Assign owner…</option>{owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}</select>
          <button disabled={busyMass !== null || !assignOwnerId} onClick={() => void massAssign()} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: 0, cursor: assignOwnerId ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "assign" ? "Assigning…" : "Assign"}</button>
          <button onClick={() => setSelected(new Set())} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", cursor: "pointer", fontSize: 13 }}>Clear</button>
        </div>
      )}

      <table style={table}>
        <thead>
          <tr style={theadRow}>
            {isAdmin && (
              <th style={{ width: 32, padding: "8px 0" }}>
                <input type="checkbox" checked={selected.size > 0 && rows.length > 0 && rows.every((c) => selected.has(c.id))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((c) => c.id)) : new Set())} />
              </th>
            )}
            <Th onClick={() => onSort("name")}>Company name{sortIndicator("name")}</Th>
            {!hiddenCols.has("industry") && <Th onClick={() => onSort("industry")}>Industry{sortIndicator("industry")}</Th>}
            {!hiddenCols.has("financing") && <Th>Types of financing</Th>}
            {!hiddenCols.has("owner_name") && <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>}
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={isAdmin ? 6 : 5} style={emptyCell}>Loading…</td></tr>}
          {err && <tr><td colSpan={isAdmin ? 6 : 5} style={{ ...emptyCell, color: "#b00020" }}>{err}</td></tr>}
          {!loading && !err && rows.length === 0 && (
            <tr><td colSpan={isAdmin ? 6 : 5} style={emptyCell}>No companies in this silo.</td></tr>
          )}
          {!loading && !err && tableRows}
        </tbody>
      </table>
      {createOpen && (
        <CreateCompanyModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {importOpen && (
        <CompaniesImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <th onClick={onClick} style={thStyle}>{children}</th>;
}

const page: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", padding: 24 };
const toolbar: CSSProperties = { display: "flex", gap: 12, marginBottom: 16 };
const searchInput: CSSProperties = {
  flex: 1, padding: 8, border: "1px solid var(--ui-border)", borderRadius: 4,
  background: "var(--ui-surface-strong)", color: "var(--ui-text)",
};
const toolbarBtn: CSSProperties = {
  padding: "8px 16px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)",
  borderRadius: 4, cursor: "pointer",
};
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "var(--ui-surface-strong)" };
const theadRow: CSSProperties = { borderBottom: "1px solid var(--ui-border)", background: "var(--ui-surface-muted)" };
const thStyle: CSSProperties = {
  padding: 12, textAlign: "left", cursor: "pointer", color: "var(--ui-text-muted)",
  textTransform: "uppercase", fontSize: 12, userSelect: "none",
};
const tdStyle: CSSProperties = { padding: 12, color: "var(--ui-text)" };
const trStyle: CSSProperties = { borderBottom: "1px solid var(--ui-border-soft)" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const tag: CSSProperties = {
  display: "inline-block", background: "#cef7e6", color: "#0a6e57",
  padding: "2px 8px", borderRadius: 12, fontSize: 12, marginRight: 4, marginBottom: 2,
};
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "var(--ui-text-muted)" };
