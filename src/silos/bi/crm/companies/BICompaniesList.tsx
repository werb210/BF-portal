// BF_PORTAL_BLOCK_v664_BI_COMPANIES_BULK
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";

type SortCol = "name" | "industry" | "created_at";

type BICompanyRow = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  city: string | null;
  province: string | null;
  industry: string | null;
  created_at: string;
  contact_count: number;
  tags?: string[] | null; // BF_PORTAL_BLOCK_v816_COMPANY_IMPORT_UI
};

export default function BICompaniesList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState<BICompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // BF_PORTAL_BLOCK_v816_COMPANY_IMPORT_UI
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [bfBusy, setBfBusy] = useState(false);
  const [bfMsg, setBfMsg] = useState<string | null>(null);
  async function importCompaniesFile(file: File) {
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r: any = await api(`/api/v1/bi/crm/companies/import`, { method: "POST", body: fd } as any);
      setImportMsg(`Companies: ${Number(r?.companies_imported ?? 0)} new, ${Number(r?.companies_updated ?? 0)} updated · Contacts: ${Number(r?.contacts_imported ?? 0)} new, ${Number(r?.contacts_updated ?? 0)} updated`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setImportMsg(`Import failed: ${e?.message ?? String(e)}`);
    } finally { setImporting(false); }
  }
  function onPickImport(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void importCompaniesFile(f);
  }
  async function importToBf() {
    if (selected.size === 0 || bfBusy) return;
    if (!window.confirm(`Import ${selected.size} company(ies) into the BF Lenders list?`)) return;
    setBfBusy(true); setBfMsg(null);
    try {
      const r: any = await api(`/api/portal/lenders/import-from-bi`, { method: "POST", body: { companyIds: Array.from(selected) } } as any);
      // Surface the real per-company skip reason (create_failed / duplicate /
      // missing_name / not_found) instead of a blanket "already exist".
      const skips: Array<{ name?: string; company_id?: string; reason?: string }> =
        Array.isArray(r?.skipped) ? r.skipped : [];
      const skipDetail = skips.length
        ? ` — ${skips.map((s) => `${s?.name || s?.company_id} (${s?.reason || "unknown"})`).join("; ")}`
        : "";
      setBfMsg(`Imported to BF: ${Number(r?.lenders_created ?? 0)} lenders, ${Number(r?.products_created ?? 0)} products${Number(r?.lenders_skipped ?? 0) ? `, ${Number(r?.lenders_skipped ?? 0)} skipped` : ""}${skipDetail}`);
      setSelected(new Set());
    } catch (e: any) {
      setBfMsg(`Import to BF failed: ${e?.message ?? String(e)}`);
    } finally { setBfBusy(false); }
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | null>(null);
  const [crmPage, setCrmPage] = useState(1); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1
  const [hasNext, setHasNext] = useState(false); // BF_PORTAL_BLOCK_v697_CRM_PAGER_FIX_v1

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        params.set("sort", `${sort.col}:${sort.dir}`);
        params.set("page", String(crmPage)); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1
        params.set("pageSize", "100");
        const r: any = await api(`/api/v1/bi/crm/companies${params.toString() ? `?${params}` : ""}`);
        const list: BICompanyRow[] = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
        if (!cancelled) { setRows(list); setHasNext(list.length >= 100); } // BF_PORTAL_BLOCK_v697_CRM_PAGER_FIX_v1
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load companies.");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [q, sort.col, sort.dir, refreshKey, crmPage]); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1

  const onSort = (col: SortCol) => setSort((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
  const sortIndicator = (col: SortCol) => (sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "");

  function toggleSel(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function createCompany() {
    if (!newName.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      await api(`/api/v1/bi/crm/companies`, { method: "POST", body: { legal_name: newName.trim(), industry: newIndustry.trim() || null } } as any);
      setNewName(""); setNewIndustry(""); setCreateOpen(false); setRefreshKey((k) => k + 1);
    } catch (e: any) { setCreateError(e?.message ?? "Could not create company."); }
    finally { setCreating(false); }
  }
  async function massDelete() {
    if (!isAdmin || selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} company(ies)? Contacts are kept; their company link is cleared.`)) return;
    setBusyMass("delete");
    try {
      await api(`/api/v1/bi/crm/companies/bulk-delete`, { method: "POST", body: { ids: Array.from(selected) } } as any);
      setSelected(new Set()); setRefreshKey((k) => k + 1);
    } catch (e: any) { window.alert(`Mass delete failed: ${e?.message ?? String(e)}`); }
    finally { setBusyMass(null); }
  }
  async function massTag() {
    if (!isAdmin || selected.size === 0 || !tagInput.trim()) return;
    setBusyMass("tag");
    try {
      await api(`/api/v1/bi/crm/companies/bulk-tag`, { method: "POST", body: { ids: Array.from(selected), tag: tagInput.trim() } } as any);
      setSelected(new Set()); setTagInput(""); setRefreshKey((k) => k + 1);
    } catch (e: any) { window.alert(`Mass tag failed: ${e?.message ?? String(e)}`); }
    finally { setBusyMass(null); }
  }

  const tableRows = useMemo(() => rows.map((r) => (
    <tr key={r.id} style={trStyle} data-testid="bi-company-row">
      {isAdmin && (
        <td style={{ padding: "8px 0", textAlign: "center" }}>
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
        </td>
      )}
      <td style={tdStyle}>
        <Link to={`/silo/bi/crm/companies/${r.id}`} style={linkStyle}>{r.legal_name}</Link>
        {r.operating_name && r.operating_name !== r.legal_name && <div style={subtleCell}>o/a {r.operating_name}</div>}
      </td>
      <td style={tdStyle}>{r.industry ?? "—"}</td>
      <td style={tdStyle}>{/* BF_PORTAL_BLOCK_v816_COMPANY_IMPORT_UI */}
        {r.tags && r.tags.length ? (
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
            {r.tags.map((t) => (<span key={t} style={biTagChip}>{t}</span>))}
          </span>
        ) : "—"}
      </td>
      <td style={tdStyle}>{r.contact_count ?? 0}</td>
      <td style={tdStyle}>{[r.city, r.province].filter(Boolean).join(", ") || "—"}</td>
      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
    </tr>
  )), [rows, isAdmin, selected]);

  const colCount = isAdmin ? 7 : 6; // BF_PORTAL_BLOCK_v816_COMPANY_IMPORT_UI (+Tags column)

  return (
    <div style={page} data-testid="bi-companies-list">
      <div style={toolbar}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" style={searchInput} aria-label="Search companies" />
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 10px", whiteSpace: "nowrap" }} aria-live="polite">{rows.length} {rows.length === 1 ? "record" : "records"}</div>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => importInputRef.current?.click()} disabled={importing} style={{ background: "#1e293b", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: "1px solid #334155", cursor: importing ? "default" : "pointer", whiteSpace: "nowrap", opacity: importing ? 0.6 : 1, marginRight: 8 }} data-testid="bi-companies-import">{importing ? "Importing…" : "Import"}</button>
        <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: "none" }} onChange={onPickImport} data-testid="bi-companies-import-input" />
        <button type="button" onClick={() => setCreateOpen((v) => !v)} style={{ background: createOpen ? "#fff" : "#0d9b6c", color: createOpen ? "#0d9b6c" : "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: createOpen ? "1px solid #0d9b6c" : 0, cursor: "pointer" }} data-testid="bi-companies-create-toggle">{createOpen ? "Cancel" : "+ Create Company"}</button>
      </div>

      {importMsg && <div style={{ fontSize: 12, color: "#34d399", padding: "0 0 8px" }} role="status">{importMsg}</div>}
      {bfMsg && <div style={{ fontSize: 12, color: "#60a5fa", padding: "0 0 8px" }} role="status">{bfMsg}</div>}
      {createOpen && (
        <div style={createBar} data-testid="bi-companies-create-form">
          <div style={{ flex: 2 }}><div style={fieldLabel}>Legal name *</div><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme Inc" style={{ ...searchInput, marginTop: 4 }} aria-label="Legal name" /></div>
          <div style={{ flex: 1 }}><div style={fieldLabel}>Industry</div><input value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} placeholder="Optional" style={{ ...searchInput, marginTop: 4 }} aria-label="Industry" /></div>
          <button type="button" onClick={() => void createCompany()} disabled={creating || !newName.trim()} style={{ background: "#0d9b6c", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0, cursor: "pointer", opacity: creating || !newName.trim() ? 0.5 : 1 }}>{creating ? "Creating…" : "Create"}</button>
          {createError && <span style={{ color: "#b00020", fontSize: 12 }} role="status">{createError}</span>}
        </div>
      )}

      {isAdmin && selected.size > 0 && (
        <div style={massBar}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
          <button disabled={busyMass !== null} onClick={massDelete} style={delBtn}>{busyMass === "delete" ? "Deleting…" : "Delete"}</button>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tag name" style={tagBox} />
          <button disabled={busyMass !== null || !tagInput.trim()} onClick={massTag} style={tagBtn}>{busyMass === "tag" ? "Tagging…" : "Apply tag"}</button>
          <button disabled={bfBusy} onClick={() => void importToBf()} style={{ padding: "6px 12px", borderRadius: 6, background: "#1d4ed8", color: "#fff", border: 0, cursor: bfBusy ? "default" : "pointer", fontSize: 13, fontWeight: 600, opacity: bfBusy ? 0.6 : 1 }} data-testid="bi-companies-import-to-bf">{bfBusy ? "Importing…" : "Import to BF"}</button>
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
            <Th onClick={() => onSort("name")}>Company name{sortIndicator("name")}</Th>
            <Th onClick={() => onSort("industry")}>Industry{sortIndicator("industry")}</Th>
            <Th>Tags</Th>{/* BF_PORTAL_BLOCK_v816_COMPANY_IMPORT_UI */}
            <Th>Contacts</Th>
            <Th>Location</Th>
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={colCount} style={emptyCell}>Loading…</td></tr>}
          {err && <tr><td colSpan={colCount} style={{ ...emptyCell, color: "#b00020" }}>{err}</td></tr>}
          {!loading && !err && rows.length === 0 && <tr><td colSpan={colCount} style={emptyCell}>No BI companies.</td></tr>}
          {!loading && !err && tableRows}
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
const createBar: CSSProperties = { background: "#f5f8fa", border: "1px solid #cbd6e2", borderRadius: 6, padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-end" };
const massBar: CSSProperties = { display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" };
const delBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 };
const tagBox: CSSProperties = { padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 };
const tagBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "#2563eb", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 };
const clearBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: 13 };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fff" };
const theadRow: CSSProperties = { borderBottom: "1px solid #cbd6e2", background: "#f5f8fa" };
const thStyle: CSSProperties = { padding: 12, textAlign: "left", cursor: "pointer", color: "#33475b", textTransform: "uppercase", fontSize: 12, userSelect: "none" };
const biTagChip: CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#1e293b", color: "#cbd5e1", whiteSpace: "nowrap" }; // BF_PORTAL_BLOCK_v816_COMPANY_IMPORT_UI
const tdStyle: CSSProperties = { padding: 12, color: "#000" };
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
const subtleCell: CSSProperties = { color: "#7c98b6", fontSize: 12, marginTop: 2 };
const fieldLabel: CSSProperties = { fontSize: 11, color: "#7c98b6", textTransform: "uppercase" };
