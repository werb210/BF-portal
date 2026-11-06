import { formatDateTimeShort } from "@/utils/labels";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useCrmBase } from "@/pages/crm/crmBase"; // BF_PORTAL_v850_KS_CRM
import { api } from "@/api";
import { crmApi, type CompanyRow } from "@/api/crm";
import { canDelete } from "@/auth/canDelete";
import { useCan } from "@/roles/permissionStore"; // BF_PORTAL_v870_CRM_DATA_MODEL
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import CreateCompanyModal from "./CreateCompanyModal";
import CompaniesImportModal from "./CompaniesImportModal";
import { useBfCrmBackend } from "@/components/crm/unified/crmUnifiedApi"; // BF_PORTAL_v856_CRM_UNIFY
import { CrmBulkTagActions, CrmTagChips, CrmTagViewBy, useTagCatalogue } from "@/components/crm/unified/CrmTags"; // BF_PORTAL_v856_CRM_UNIFY
import ColumnsMenu from "@/components/crm/ColumnsMenu";
import { exportFileName, fetchAllRows, rowsToCsv, saveCsv, type ExportColumn } from "@/pages/crm/crmExport"; // BF_PORTAL_v907_CRM_EXPORT
import { bulkDeleteMessage, skippedFrom } from "@/pages/crm/bulkDeleteResult"; // BF_PORTAL_v907_PARTIAL_BULK_DELETE
import { refusedDeleteMessage } from "@/retention/retention"; // BF_PORTAL_v855_RETENTION
import CustomFieldFilters from "@/crmFields/CustomFieldFilters"; // BF_PORTAL_v870_CRM_DATA_MODEL
import { useCustomFieldColumns } from "@/crmFields/useCustomFieldColumns"; // BF_PORTAL_v870_CRM_DATA_MODEL
import { displayValue, filterParams, type CustomFilter } from "@/crmFields/customFieldsApi"; // BF_PORTAL_v870_CRM_DATA_MODEL

type SortCol = "name" | "industry" | "owner_name" | "created_at" | `cf_${string}`;


export default function CompaniesPage() {
  const { silo } = useSilo();
  const crmBase = useCrmBase(); // BF_PORTAL_v850_KS_CRM
  const { user } = useAuth();
  const roleCan = { create: useCan("companies", "create"), del: useCan("companies", "delete"), exp: useCan("companies", "export") }; // BF_PORTAL_v870_CRM_DATA_MODEL
  const showDelete = canDelete(user?.role as any) && roleCan.del;
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // BF_PORTAL_CRM_TOTALS_v1 - companies had no pager at all, and the server had no
  // paging either (a hardcoded LIMIT 500). Both now page, with a real total.
  const [crmPage, setCrmPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | "active" | "assign" | null>(null);
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]);
  const [ownerId, setOwnerId] = useState("");
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  // BF_PORTAL_v870_CRM_DATA_MODEL - custom field columns and filters.
  const [cfFilters, setCfFilters] = useState<CustomFilter[]>([]);
  const cf = useCustomFieldColumns("company");
  const cfParamKey = JSON.stringify(cfFilters);
  const crmBackend = useBfCrmBackend(); // BF_PORTAL_v856_CRM_UNIFY
  const { catalogue: tagCatalogue, reload: reloadTags } = useTagCatalogue(crmBackend, refreshKey); // BF_PORTAL_v856_CRM_UNIFY
  const toggleCol = (k: string) => setHiddenCols((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  void showDelete;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.listCompaniesPaged({
          silo: String(silo).toLowerCase(),
          q,
          owner_id: ownerId || undefined,
          tag: tagFilter || undefined,
          sort: `${sort.col}:${sort.dir}`,
          page: crmPage, // BF_PORTAL_CRM_TOTALS_v1
          pageSize: COMPANIES_PAGE_SIZE,
          ...filterParams(cfFilters), // BF_PORTAL_v870_CRM_DATA_MODEL
        });
        if (!cancelled) { setRows(r.rows); setTotal(r.total); }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load companies.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [silo, q, sort.col, sort.dir, refreshKey, ownerId, tagFilter, crmPage, cfParamKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // BF_PORTAL_CRM_TOTALS_v1 - a filter/sort change re-queries from page 1.
  useEffect(() => { setCrmPage(1); }, [silo, q, sort.col, sort.dir, ownerId, tagFilter, cfParamKey]);

  const hasNext = crmPage * COMPANIES_PAGE_SIZE < total;
  const rangeStart = total === 0 ? 0 : (crmPage - 1) * COMPANIES_PAGE_SIZE + 1;
  const rangeEnd = Math.min(crmPage * COMPANIES_PAGE_SIZE, total);

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
      const r = await crmApi.bulkDeleteCompanies(Array.from(selected));
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
      // BF_PORTAL_v907_PARTIAL_BULK_DELETE - the deletable ones are gone; say which were left and why.
      const skipped = skippedFrom(r);
      if (skipped.length) window.alert(bulkDeleteMessage("company", Number((r as { deleted?: number })?.deleted ?? 0), skipped));
    } catch (err) {
      const skipped = skippedFrom(err);
      if (skipped.length && !refusedDeleteMessage(err)) { window.alert(bulkDeleteMessage("company", 0, skipped)); return; }
      window.alert(refusedDeleteMessage(err) ?? `Mass delete failed: ${err instanceof Error ? err.message : String(err)}`); // BF_PORTAL_v855_RETENTION
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

  // BF_PORTAL_v907_CRM_EXPORT - every company matching the current view, in the columns shown.
  const [exporting, setExporting] = useState<string | null>(null);
  async function exportAll() {
    setExporting("Preparing…");
    try {
      const all = await fetchAllRows<CompanyRow>((p, size) => crmApi.listCompaniesPaged({
        silo: String(silo).toLowerCase(), q, owner_id: ownerId || undefined, tag: tagFilter || undefined, sort: `${sort.col}:${sort.dir}`,
        page: p, pageSize: size, ...filterParams(cfFilters),
      }), (n, t) => setExporting(`Preparing ${n.toLocaleString()} of ${t.toLocaleString()}…`));
      if (!all.length) { window.alert("No companies match this view, so there is nothing to export."); return; }
      const cols: ExportColumn<CompanyRow>[] = [
        { label: "Company name", value: (r) => r.name },
        { label: "Website / domain", value: (r) => r.domain },
        { label: "City", value: (r) => r.city },
        ...(!hiddenCols.has("industry") ? [{ label: "Industry", value: (r: CompanyRow) => r.industry }] : []),
        ...(!hiddenCols.has("tags") ? [{ label: "Tags", value: (r: CompanyRow) => (r as { tags?: string[] | null }).tags }] : []),
        ...(!hiddenCols.has("owner_name") ? [{ label: "Owner", value: (r: CompanyRow) => r.owner_name }] : []),
        ...cf.shown.map((f) => ({ label: f.label, value: (r: CompanyRow) => displayValue(f, (r as { custom_fields?: Record<string, unknown> }).custom_fields?.[f.name]) })),
        { label: "Create date", value: (r) => r.created_at },
      ];
      await saveCsv(exportFileName("companies"), rowsToCsv(all, cols));
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") window.alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setExporting(null); }
  }

  const tableRows = useMemo(() => rows.map(r => (
    <tr key={r.id} style={trStyle}>
      {isAdmin && (
        <td style={{ padding: "8px 0", textAlign: "center" }}>
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
        </td>
      )}
      <td style={tdStyle}>
        <Link to={`${crmBase}/companies/${r.id}`} style={linkStyle}>{r.name}</Link>
      </td>
      {!hiddenCols.has("industry") && <td style={tdStyle}>{r.industry ?? "—"}</td>}
      {!hiddenCols.has("tags") && (
      <td style={tdStyle}><CrmTagChips tags={(r as { tags?: string[] | null }).tags} catalogue={tagCatalogue} /></td>
      )}{/* BF_PORTAL_v856_CRM_UNIFY - Tags replace Types of financing */}
      {!hiddenCols.has("owner_name") && <td style={tdStyle}>{r.owner_name ?? "—"}</td>}
      {cf.shown.map((f) => <td key={f.name} style={tdStyle}>{displayValue(f, (r as { custom_fields?: Record<string, unknown> }).custom_fields?.[f.name]) || "—"}</td>)}{/* BF_PORTAL_v870_CRM_DATA_MODEL */}
      <td style={tdStyle}>{formatDateTimeShort(r.created_at)}</td>
    </tr>
  )), [isAdmin, rows, selected, hiddenCols, crmBase, tagCatalogue, cf.shown]); // BF_PORTAL_v856_CRM_UNIFY

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
        {roleCan.exp && <button style={toolbarBtn} disabled={exporting !== null} onClick={() => void exportAll()} data-testid="companies-export">{exporting ?? "Export"}</button>}
        <ColumnsMenu options={[{ key: "industry", label: "Industry" }, { key: "tags", label: "Tags" }, { key: "owner_name", label: "Owner" }, ...cf.columnOptions]} hidden={cf.hiddenWith(hiddenCols)} onToggle={(k) => (cf.isCfKey(k) ? cf.toggle(k) : toggleCol(k))} style={toolbarBtn} />
        {roleCan.create && <button onClick={() => setImportOpen(true)} style={toolbarBtn}>Import</button>}
        <button
          onClick={() => setCreateOpen(true)}
          style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0 }}
        >+ Create Company</button>
      </div>
      {/* BF_PORTAL_v856_CRM_UNIFY - the shared View-by chips. */}
      <CrmTagViewBy backend={crmBackend} entity="company" value={tagFilter ? tagFilter.split(",") : []}
        onChange={(next) => setTagFilter(next.join(","))} catalogue={tagCatalogue} onCatalogueChanged={reloadTags} />
      <CustomFieldFilters fields={cf.fields} value={cfFilters} onChange={setCfFilters} />{/* BF_PORTAL_v870_CRM_DATA_MODEL */}
      {isAdmin && selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
          <button disabled={busyMass !== null} onClick={massDelete} style={{ padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "delete" ? "Deleting…" : "Delete"}</button>
          {/* BF_PORTAL_v856_CRM_UNIFY - Tag as... and Remove tag (Active included). */}
          <CrmBulkTagActions backend={crmBackend} entity="company" ids={Array.from(selected)} catalogue={tagCatalogue}
            onDone={() => { setSelected(new Set()); setRefreshKey((k) => k + 1); }} />
          <select value={assignOwnerId} onChange={(e) => setAssignOwnerId(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)" }}><option value="">Assign owner…</option>{owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}</select>
          <button disabled={busyMass !== null || !assignOwnerId} onClick={() => void massAssign()} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: 0, cursor: assignOwnerId ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "assign" ? "Assigning…" : "Assign"}</button>
          <button onClick={() => setSelected(new Set())} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", cursor: "pointer", fontSize: 13 }}>Clear</button>
        </div>
      )}

      {/* BF_PORTAL_CRM_TOTALS_v1 - Prev/Next + real total, matching Contacts. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
          {total === 0 ? "No companies" : `${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
        </span>
        <button type="button" disabled={crmPage <= 1} onClick={() => setCrmPage((p) => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: crmPage <= 1 ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: crmPage <= 1 ? "default" : "pointer" }}>Prev</button>
        <button type="button" disabled={!hasNext} onClick={() => setCrmPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: !hasNext ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: !hasNext ? "default" : "pointer" }}>Next</button>
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
            {!hiddenCols.has("industry") && <Th onClick={() => onSort("industry")}>Industry{sortIndicator("industry")}</Th>}
            {!hiddenCols.has("tags") && <Th>Tags</Th>}{/* BF_PORTAL_v856_CRM_UNIFY */}
            {!hiddenCols.has("owner_name") && <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>}
            {cf.shown.map((f) => <Th key={f.name} onClick={() => onSort(`cf_${f.name}`)}>{f.label}{sortIndicator(`cf_${f.name}`)}</Th>)}
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={(isAdmin ? 6 : 5) + cf.shown.length} style={emptyCell}>Loading…</td></tr>}
          {err && <tr><td colSpan={(isAdmin ? 6 : 5) + cf.shown.length} style={{ ...emptyCell, color: "#b00020" }}>{err}</td></tr>}
          {!loading && !err && rows.length === 0 && (
            <tr><td colSpan={(isAdmin ? 6 : 5) + cf.shown.length} style={emptyCell}>No companies in this silo.</td></tr>
          )}
          {!loading && !err && tableRows}
        </tbody>
      </table>


      {/* BF_PORTAL_BOTTOM_PAGER_v1 - same controls mirrored under the table, so a long list does not force a scroll back to the top to page - Prev/Next + real total, matching Contacts. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
          {total === 0 ? "No companies" : `${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
        </span>
        <button type="button" disabled={crmPage <= 1} onClick={() => setCrmPage((p) => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: crmPage <= 1 ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: crmPage <= 1 ? "default" : "pointer" }}>Prev</button>
        <button type="button" disabled={!hasNext} onClick={() => setCrmPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: !hasNext ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: !hasNext ? "default" : "pointer" }}>Next</button>
      </div>

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

// BF_PORTAL_CRM_TOTALS_v1 - server default 200, hard max 500.
const COMPANIES_PAGE_SIZE = 200;

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
