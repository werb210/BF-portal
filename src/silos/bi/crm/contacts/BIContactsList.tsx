// BF_PORTAL_BLOCK_v664_BI_CONTACTS_BULK
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { exportRowsToCsv } from "@/utils/csvExport";
import ColumnsMenu from "@/components/crm/ColumnsMenu";

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
  // BF_PORTAL_BLOCK_v813_BI_CRM_IMPORT — import a spreadsheet straight into the BI CRM (same importer as Outreach).
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  async function importFile(file: File) {
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r: any = await api(`/api/v1/bi/crm/outreach/import`, { method: "POST", body: fd } as any);
      const imported = Number(r?.imported ?? 0), updated = Number(r?.updated ?? 0), suppressed = Number(r?.suppressed ?? 0), skipped = Number(r?.skipped ?? 0);
      setImportMsg(`Imported ${imported} · updated ${updated} · suppressed ${suppressed} · skipped ${skipped}`);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setImportMsg(`Import failed: ${e?.message ?? String(e)}`);
    } finally { setImporting(false); }
  }
  function onPickImport(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void importFile(f);
  }
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | "assign" | null>(null);
  // BF_PORTAL_BLOCK_v809_BI_ASSIGN_CREATE
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", phone_e164: "", title: "" });
  const [creating, setCreating] = useState(false);
  // BF_PORTAL_BLOCK_v807_BI_OWNER_PARITY — resolve owner UUID -> staff name + owner filter (BF parity).
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]);
  const [ownerId, setOwnerId] = useState("");
  const [crmPage, setCrmPage] = useState(1); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1
  const [tagOptions, setTagOptions] = useState<string[]>([]); // BF_PORTAL_BLOCK_v749_VIEWBY
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set()); // BF_PORTAL_BLOCK_v749_VIEWBY
  const tagKey = Array.from(tagFilter).sort().join(","); // BF_PORTAL_BLOCK_v749_VIEWBY
  const chipBtn = (active: boolean): CSSProperties => ({ // BF_PORTAL_BLOCK_v749_VIEWBY
    fontSize: 12, padding: "3px 10px", borderRadius: 999,
    border: active ? "1px solid #6366f1" : "1px solid #334155",
    background: active ? "#4f46e5" : "transparent",
    color: active ? "#fff" : "var(--ui-border)", cursor: "pointer", whiteSpace: "nowrap",
  });
  function toggleTag(t: string) { // BF_PORTAL_BLOCK_v749_VIEWBY
    setTagFilter((p) => { const n = new Set(p); if (n.has(t)) n.delete(t); else n.add(t); return n; });
    setCrmPage(1);
  }
  const [hasNext, setHasNext] = useState(false); // BF_PORTAL_BLOCK_v697_CRM_PAGER_FIX_v1
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const toggleCol = (k: string) => setHiddenCols((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  useEffect(() => { // BF_PORTAL_BLOCK_v749_VIEWBY — distinct tags for the View-by filter
    let cancelled = false;
    (async () => {
      try { const r: any = await api(`/api/v1/bi/crm/contacts/tag-list`); if (!cancelled) setTagOptions(Array.isArray(r?.tags) ? r.tags : []); }
      catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ users?: Array<{ id: string; first_name?: string; last_name?: string }> } | Array<{ id: string; first_name?: string; last_name?: string }>>("/api/users");
        const list = Array.isArray(r) ? r : (r?.users ?? []);
        if (!cancelled) setOwners(list);
      } catch {
        if (!cancelled) setOwners([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ownerName = (id: string | null): string => {
    if (!id) return "—";
    const owner = owners.find((u) => u.id === id);
    const name = owner ? `${owner.first_name ?? ""} ${owner.last_name ?? ""}`.trim() : "";
    return name || "—";
  };

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
        if (tagKey) params.set("tags", tagKey); // BF_PORTAL_BLOCK_v749_VIEWBY
        if (ownerId) params.set("owner_id", ownerId); // BF_PORTAL_BLOCK_v807_BI_OWNER_PARITY
        const r: any = await api(`/api/v1/bi/crm/contacts${params.toString() ? `?${params}` : ""}`);
        const list: BIContactRow[] = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : Array.isArray(r?.data) ? r.data : [];
        if (!cancelled) { setRows(list); setHasNext(list.length >= 100); } // BF_PORTAL_BLOCK_v697_CRM_PAGER_FIX_v1
      } catch (e: any) {
        if (!cancelled) { setErr(`Could not load contacts. Please refresh. (${e?.message ?? "unknown_error"})`); setLoadFailed(true); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [q, sort.col, sort.dir, refreshKey, crmPage, tagKey, ownerId]); // BF_PORTAL_BLOCK_v696_CRM_PAGER_v1

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
  // BF_PORTAL_BLOCK_v809_BI_ASSIGN_CREATE — assign selected contacts to a staff owner (v808).
  async function massAssign(ownerId: string) {
    if (!isAdmin || selected.size === 0 || !ownerId) return;
    setBusyMass("assign");
    try {
      await api(`/api/v1/bi/crm/contacts/bulk-assign`, { method: "POST", body: { ids: Array.from(selected), owner_id: ownerId } } as any);
      setSelected(new Set()); setRefreshKey((k) => k + 1);
    } catch (e: any) { window.alert(`Assign failed: ${e?.message ?? String(e)}`); }
    finally { setBusyMass(null); }
  }
  async function createContact() {
    const f = createForm;
    if (!f.full_name.trim() && !f.email.trim() && !f.phone_e164.trim()) { window.alert("Enter a name, email, or phone."); return; }
    setCreating(true);
    try {
      await api(`/api/v1/bi/crm/contacts`, { method: "POST", body: { full_name: f.full_name.trim() || undefined, email: f.email.trim() || undefined, phone_e164: f.phone_e164.trim() || undefined, title: f.title.trim() || undefined } } as any);
      setCreateOpen(false); setCreateForm({ full_name: "", email: "", phone_e164: "", title: "" }); setRefreshKey((k) => k + 1);
    } catch (e: any) { window.alert(`Create failed: ${e?.message ?? String(e)}`); }
    finally { setCreating(false); }
  }

  const tableRows = useMemo(() => rows.map((r) => (
    <tr key={r.id} style={trStyle} data-testid="bi-contact-row">
      {isAdmin && (
        <td style={{ padding: "8px 0", textAlign: "center" }}>
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
        </td>
      )}
      <td style={tdStyle}><Link to={`/silo/bi/crm/contacts/${r.id}`} style={linkStyle}>{r.full_name || "(no name)"}</Link></td>
      {!hiddenCols.has("company_name") && <td style={tdStyle}>{r.company_name ?? "—"}</td>}
      {!hiddenCols.has("tags") && <td style={tdStyle}>{r.tags && r.tags.length ? (<span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>{r.tags.map((t) => (<span key={t} style={tagChip}>{t}</span>))}</span>) : "—"}</td>}{/* BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1 */}
      {!hiddenCols.has("lead_status") && <td style={tdStyle}>{r.outreach_status ? r.outreach_status.replace(/_/g, " ") : "—"}</td>}
      {!hiddenCols.has("owner_name") && <td style={tdStyle}>{ownerName(r.outreach_owner_id)}</td>}
      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
    </tr>
  )), [rows, isAdmin, selected, owners, hiddenCols]);

  const colCount = isAdmin ? 7 : 6; // BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1 (+Tags col)

  return (
    <div style={page} data-testid="bi-contacts-list">
      <div style={toolbar}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" style={searchInput} aria-label="Search contacts" />
        <ColumnsMenu options={[{ key: "company_name", label: "Company" }, { key: "tags", label: "Tags" }, { key: "lead_status", label: "Lead status" }, { key: "owner_name", label: "Owner" }]} hidden={hiddenCols} onToggle={toggleCol} style={{ background: "#1e293b", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: "1px solid #334155", cursor: "pointer", whiteSpace: "nowrap" }} />
        <button type="button" onClick={() => exportRowsToCsv("bi-contacts.csv", rows as any)} style={{ background: "#1e293b", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: "1px solid #334155", cursor: "pointer", whiteSpace: "nowrap" }} data-testid="bi-contacts-export">Export</button>
        <select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); setCrmPage(1); }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "var(--ui-border)", fontSize: 13 }} aria-label="Filter by owner" data-testid="bi-owner-filter">
          <option value="">All owners</option>
          {owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}
        </select>
        <div style={{ fontSize: 13, color: "var(--ui-text-muted)", padding: "6px 10px", whiteSpace: "nowrap" }} aria-live="polite">{rows.length} {rows.length === 1 ? "record" : "records"}</div>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => importInputRef.current?.click()} disabled={importing} style={{ background: "#1e293b", color: "#fff", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: "1px solid #334155", cursor: importing ? "default" : "pointer", whiteSpace: "nowrap", opacity: importing ? 0.6 : 1 }}>{importing ? "Importing…" : "Import"}</button>
        <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: "none" }} onChange={onPickImport} data-testid="bi-crm-import-input" />
        <button type="button" onClick={() => setCreateOpen(true)} style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0, cursor: "pointer", whiteSpace: "nowrap" }}>+ Create Contact</button>
      </div>

      {importMsg && <div style={{ fontSize: 12, color: "#34d399", padding: "0 0 8px" }} role="status">{importMsg}</div>}
      {/* BF_PORTAL_BLOCK_v749_VIEWBY — View-by tag filter (multi-select) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 0 10px" }}>
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)", alignSelf: "center", marginRight: 2 }}>View by:</span>
        <button type="button" onClick={() => { setTagFilter(new Set()); setCrmPage(1); }} style={chipBtn(tagFilter.size === 0)}>All</button>
        <button type="button" onClick={() => toggleTag("__none__")} style={chipBtn(tagFilter.has("__none__"))}>Untagged</button>
        {tagOptions.map((t) => (
          <button key={t} type="button" onClick={() => toggleTag(t)} style={chipBtn(tagFilter.has(t))}>{t}</button>
        ))}
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
            <option value="active">Active</option>
          </select>
          <select value="" disabled={busyMass !== null} onChange={(e) => { const v = e.target.value; if (v) void massAssign(v); }} style={tagBox}>
            <option value="">{busyMass === "assign" ? "Assigning…" : "Assign owner…"}</option>
            {owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}
          </select>
          <button onClick={() => setSelected(new Set())} style={clearBtn}>Clear</button>
        </div>
      )}

      {createOpen && (
        <div onClick={() => !creating && setCreateOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 20, width: 380, maxWidth: "90vw", color: "var(--ui-border)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>New BI contact</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={createForm.full_name} onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "var(--ui-border)", fontSize: 13 }} />
              <input value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "var(--ui-border)", fontSize: 13 }} />
              <input value={createForm.phone_e164} onChange={(e) => setCreateForm((f) => ({ ...f, phone_e164: e.target.value }))} placeholder="Phone (E.164)" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "var(--ui-border)", fontSize: 13 }} />
              <input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title (optional)" style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "var(--ui-border)", fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button type="button" disabled={creating} onClick={() => setCreateOpen(false)} style={clearBtn}>Cancel</button>
              <button type="button" disabled={creating} onClick={() => void createContact()} style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>{creating ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* BF_PORTAL_BLOCK_v698_CRM_PAGER_TOP_v1 — top pager */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Page {crmPage}</span>
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
            <Th onClick={() => onSort("name")}>Name{sortIndicator("name")}</Th>
            {!hiddenCols.has("company_name") && <Th onClick={() => onSort("company_name")}>Company{sortIndicator("company_name")}</Th>}
            {!hiddenCols.has("tags") && <th style={thStyle}>Tags</th>}{/* BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1 */}
            {!hiddenCols.has("lead_status") && <Th onClick={() => onSort("lead_status")}>Lead status{sortIndicator("lead_status")}</Th>}
            {!hiddenCols.has("owner_name") && <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>}
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
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Page {crmPage}</span>
        <button type="button" disabled={crmPage <= 1} onClick={() => setCrmPage((p) => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: crmPage <= 1 ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: crmPage <= 1 ? "default" : "pointer" }}>Prev</button>
        <button type="button" disabled={!hasNext} onClick={() => setCrmPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: !hasNext ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: !hasNext ? "default" : "pointer" }}>Next</button>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <th onClick={onClick} style={thStyle}>{children}</th>;
}

const page: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", padding: 24, borderRadius: 8 };
const toolbar: CSSProperties = { display: "flex", gap: 12, marginBottom: 16, alignItems: "center" };
const searchInput: CSSProperties = { flex: 1, padding: 8, border: "1px solid var(--ui-border)", borderRadius: 4, background: "var(--ui-surface-strong)", color: "var(--ui-text)" };
const massBar: CSSProperties = { display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" };
const delBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 };
const tagBox: CSSProperties = { padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13 };
const clearBtn: CSSProperties = { padding: "6px 12px", borderRadius: 6, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", cursor: "pointer", fontSize: 13 };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "var(--ui-surface-strong)" };
const theadRow: CSSProperties = { borderBottom: "1px solid var(--ui-border)", background: "#f5f8fa" };
const thStyle: CSSProperties = { padding: 12, textAlign: "left", cursor: "pointer", color: "#33475b", textTransform: "uppercase", fontSize: 12, userSelect: "none" };
const tdStyle: CSSProperties = { padding: 12, color: "var(--ui-text)" };
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
const tagChip: CSSProperties = { display: "inline-block", fontSize: 11, color: "var(--ui-text)", background: "var(--ui-border)", borderRadius: 10, padding: "1px 8px" }; // BF_PORTAL_BLOCK_v698_TAGS_COLUMN_v1
