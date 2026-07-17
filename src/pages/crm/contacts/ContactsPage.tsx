import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import ColumnsMenu from "@/components/crm/ColumnsMenu";
import { contactDisplayName } from "@/utils/contactName";
import { crmApi, type ContactRow } from "@/api/crm";
import { canDelete } from "@/auth/canDelete";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { useCrmStore } from "@/state/crm.store";
import CreateContactModal from "./CreateContactModal";
import ImportContactsModal from "./ImportContactsModal";
import { exportRowsToCsv } from "@/utils/csvExport";

type SortCol = "name" | "company_name" | "lead_status" | "owner_name" | "created_at";


export default function ContactsPage() {
  const { silo } = useSilo();
  const { user } = useAuth();
  const showDelete = canDelete(user?.role as any);
  const isAdmin = user?.role === "Admin";
  // BF_PORTAL_CRM_FILTER_PERSIST_v1 - remember the list view (tag/owner/search/sort/page) so
  // opening a contact and hitting Back restores it instead of resetting to the default view.
  const savedFilters = useMemo<Record<string, unknown>>(() => {
    try { return JSON.parse(sessionStorage.getItem("crm.contacts.filters") || "{}") as Record<string, unknown>; } catch { return {}; }
  }, []);
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [q, setQ] = useState<string>(typeof savedFilters.q === "string" ? savedFilters.q : "");
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]);
  const [ownerId, setOwnerId] = useState<string>(typeof savedFilters.ownerId === "string" ? savedFilters.ownerId : "");
  const [tagFilter, setTagFilter] = useState<string>(typeof savedFilters.tagFilter === "string" ? savedFilters.tagFilter : ""); // BF_PORTAL_BLOCK_v806_TAG_FILTER
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>(() => {
    const sv = savedFilters.sort as { col?: SortCol; dir?: "asc" | "desc" } | undefined;
    return sv && typeof sv.col === "string" ? { col: sv.col, dir: sv.dir === "asc" ? "asc" : "desc" } : { col: "created_at", dir: "desc" };
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // BF_PORTAL_BF_CONTACTS_PAGER_v1 - the server has always supported ?page/&pageSize
  // (GET /api/crm/contacts, default 200, max 500) and BI already ships a pager, but
  // BF never sent a page at all - so it silently showed only the FIRST 200 contacts
  // with no way to reach the rest. With 2,777 contacts that hid ~93% of the list.
  const [crmPage, setCrmPage] = useState<number>(typeof savedFilters.crmPage === "number" && savedFilters.crmPage > 0 ? savedFilters.crmPage : 1);
  // BF_PORTAL_CRM_TOTALS_v1 - v3 inferred hasNext from "a full page came back", which
  // mis-fires on exact multiples of the page size (a dead Next click onto an empty
  // page). The server now returns a real total, so paging is exact and we can show
  // the range.
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | "active" | "assign" | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const toggleCol = (k: string) => setHiddenCols((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.listContactsPaged({ // BF_PORTAL_CRM_TOTALS_v1
          silo: String(silo).toLowerCase(),
          // v193_contact_search: server reads `search` not `q`.
          search: q,
          q,
          sort: `${sort.col}:${sort.dir}`,
          owner_id: ownerId || undefined,
          tag: tagFilter || undefined, // BF_PORTAL_BLOCK_v806_TAG_FILTER
          page: crmPage, // BF_PORTAL_BF_CONTACTS_PAGER_v1
          pageSize: CONTACTS_PAGE_SIZE,
        });
        if (!cancelled) { setRows(r.rows); setTotal(r.total); }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contacts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [silo, q, sort.col, sort.dir, ownerId, tagFilter, refreshKey, crmPage]);

  // BF_PORTAL_BF_CONTACTS_PAGER_v1 - any change to the filters/sort re-queries from
  // the top; staying on page 7 of a now-2-page result would render an empty table.
  // BF_PORTAL_CRM_FILTER_PERSIST_v1 - save the view on change, and don't clobber the
  // restored page on the initial mount (only reset to page 1 when filters actually change).
  useEffect(() => {
    try { sessionStorage.setItem("crm.contacts.filters", JSON.stringify({ q, ownerId, tagFilter, sort, crmPage })); } catch { /* ignore */ }
  }, [q, ownerId, tagFilter, sort, crmPage]);
  const filtersMountRef = useRef(false);
  useEffect(() => {
    if (!filtersMountRef.current) { filtersMountRef.current = true; return; }
    setCrmPage(1);
  }, [silo, q, sort.col, sort.dir, ownerId, tagFilter]);

  // BF_PORTAL_CRM_TOTALS_v1 - exact, from the server's total.
  const hasNext = crmPage * CONTACTS_PAGE_SIZE < total;
  const rangeStart = total === 0 ? 0 : (crmPage - 1) * CONTACTS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(crmPage * CONTACTS_PAGE_SIZE, total);

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
    if (!window.confirm(`Hard-delete ${selected.size} contact(s)? This cannot be undone. Use only for Apollo imports — never for applicants.`)) return;
    setBusyMass("delete");
    try {
      await crmApi.bulkDeleteContacts(Array.from(selected));
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Mass delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }
  async function massTag() {
    if (!isAdmin || selected.size === 0 || !tagInput.trim()) return;
    if (!window.confirm(`Apply tag "${tagInput.trim()}" to ${selected.size} contact(s)? Tags can trigger background jobs (lender/applicant fan-out).`)) return;
    setBusyMass("tag");
    try {
      await crmApi.bulkTagContacts(Array.from(selected), tagInput.trim());
      setSelected(new Set());
      setTagInput("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Mass tag failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }


  // BF_PORTAL_BLOCK_v802_ACTIVE_TAG — one-click "active" tag (consistent lowercase, no typos).
  async function tagActive() {
    // BF_PORTAL_BLOCK_v827_TAG_ACTIVE_NO_CONFIRM — drop window.confirm(): iPad/iOS Safari
    // (especially in standalone/PWA mode) suppresses JS confirm dialogs, so confirm() returned
    // false and the tag silently never applied. "Active" is a benign, reversible tag, so no
    // confirmation is needed.
    if (!isAdmin || selected.size === 0) return;
    setBusyMass("active");
    try {
      await crmApi.bulkTagContacts(Array.from(selected), "active");
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Tag failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusyMass(null); }
  }

  async function massAssign() {
    if (!isAdmin || selected.size === 0 || !assignOwnerId) return;
    setBusyMass("assign");
    try {
      await crmApi.bulkAssignContacts(Array.from(selected), assignOwnerId);
      setSelected(new Set());
      setAssignOwnerId("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      window.alert(`Mass assign failed: ${err instanceof Error ? err.message : String(err)}`);
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
        <Link to={`/crm/contacts/${r.id}`} style={linkStyle}>{contactDisplayName(r.name, { company: r.company_name, email: r.email })}</Link>
      </td>
      {!hiddenCols.has("company_name") && <td style={tdStyle}>{r.company_name ?? "—"}</td>}
      {!hiddenCols.has("tags") && (
      <td style={tdStyle}>{/* BF_PORTAL_BLOCK_v811_TAGS_COLUMN */}
        {r.tags && r.tags.length ? (
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
            {r.tags.map((t) => (
              <span key={t} style={t.toLowerCase() === "active" ? activeChip : tagChip}>{t}</span>
            ))}
          </span>
        ) : "—"}
      </td>
      )}
      {!hiddenCols.has("lead_status") && (
      <td style={tdStyle}>{(
        r.lead_status === "applicant" ||
        ((r as any).types_of_financing ?? []).includes("APPLICANT") ||
        Number((r as any).applications_count ?? 0) > 0
          ? "Applicant"
          : r.lead_status === "lender"
          ? "Lender"
          : (r.lead_status ?? "New")
      )}</td>
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
          placeholder="Search contacts"
          style={searchInput}
        />
        <select
          data-testid="owner-filter"
          value={ownerId}
          onChange={(e) => {
            const value = e.target.value;
            setOwnerId(value);
            useCrmStore.setState((state) => ({
              ...state,
              filters: { ...state.filters, owner: value || null },
            }));
          }}
          style={ownerSelect}
        >
          <option value="">All owners</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>
          ))}
        </select>
        <select
          data-testid="tag-filter"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={ownerSelect}
          title="Filter by tag"
        >
          <option value="">All contacts</option>
          <option value="active">Active only</option>
        </select>
        <button style={toolbarBtn} onClick={() => exportRowsToCsv("bf-contacts.csv", rows as any)}>Export</button>
        <ColumnsMenu options={[{ key: "company_name", label: "Company" }, { key: "tags", label: "Tags" }, { key: "lead_status", label: "Lead status" }, { key: "owner_name", label: "Owner" }]} hidden={hiddenCols} onToggle={toggleCol} style={toolbarBtn} />
        <button onClick={() => setImportOpen(true)} style={toolbarBtn}>Import</button>
        <button onClick={() => setCreateOpen(true)} style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0 }}>+ Create Contact</button>
      </div>
      {isAdmin && selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
          <button disabled={busyMass !== null} onClick={massDelete} style={{ padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "delete" ? "Deleting…" : "Delete"}</button>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tag name" style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13 }} />
          <button disabled={busyMass !== null || !tagInput.trim()} onClick={massTag} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--ui-accent-blue)", color: "#fff", border: 0, cursor: tagInput.trim() ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "tag" ? "Tagging…" : "Apply tag"}</button>
          <button disabled={busyMass !== null} onClick={() => void tagActive()} title='Tag selected contacts as "active"' style={{ padding: "6px 12px", borderRadius: 6, background: "#16a34a", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "active" ? "Tagging…" : "Tag Active"}</button>
          <select value={assignOwnerId} onChange={(e) => setAssignOwnerId(e.target.value)} style={{ padding: "6px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)" }}>
            <option value="">Assign owner…</option>
            {owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}
          </select>
          <button disabled={busyMass !== null || !assignOwnerId} onClick={massAssign} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--accent)", color: "#fff", border: 0, cursor: assignOwnerId ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "assign" ? "Assigning…" : "Assign"}</button>
          <button onClick={() => setSelected(new Set())} style={{ padding: "6px 12px", borderRadius: 6, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", cursor: "pointer", fontSize: 13 }}>Clear</button>
        </div>
      )}

      {/* BF_PORTAL_BF_CONTACTS_PAGER_v1 - same Prev/Next control BI already uses. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
          {total === 0 ? "No contacts" : `${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
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
            <Th onClick={() => onSort("name")}>Name{sortIndicator("name")}</Th>
            {!hiddenCols.has("company_name") && <Th onClick={() => onSort("company_name")}>Company{sortIndicator("company_name")}</Th>}
            {!hiddenCols.has("tags") && <Th>Tags</Th>}{/* BF_PORTAL_BLOCK_v811_TAGS_COLUMN */}
            {!hiddenCols.has("lead_status") && <Th onClick={() => onSort("lead_status")}>Lead status{sortIndicator("lead_status")}</Th>}
            {!hiddenCols.has("owner_name") && <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>}
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={isAdmin ? 7 : 6} style={emptyCell}>Loading…</td></tr>}
          {err && <tr><td colSpan={isAdmin ? 7 : 6} style={{ ...emptyCell, color: "#b00020" }}>{err}</td></tr>}
          {!loading && !err && rows.length === 0 && (
            <tr><td colSpan={isAdmin ? 7 : 6} style={emptyCell}>No contacts in this silo.</td></tr>
          )}
          {!loading && !err && tableRows}
        </tbody>
      </table>


      {/* BF_PORTAL_BOTTOM_PAGER_v1 - same controls mirrored under the table, so a long list does not force a scroll back to the top to page. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
        <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
          {total === 0 ? "No contacts" : `${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
        </span>
        <button type="button" disabled={crmPage <= 1} onClick={() => setCrmPage((p) => Math.max(1, p - 1))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: crmPage <= 1 ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: crmPage <= 1 ? "default" : "pointer" }}>Prev</button>
        <button type="button" disabled={!hasNext} onClick={() => setCrmPage((p) => p + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: !hasNext ? "var(--ui-surface-muted)" : "#fff", color: "var(--ui-accent-blue)", fontWeight: 600, cursor: !hasNext ? "default" : "pointer" }}>Next</button>
      </div>

      {createOpen && (
        <CreateContactModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {importOpen && (
        <ImportContactsModal
          onClose={() => setImportOpen(false)}
          onDone={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <th onClick={onClick} style={thStyle}>{children}</th>;
}

// BF_PORTAL_BF_CONTACTS_PAGER_v1 - matches the server default (max 500).
const CONTACTS_PAGE_SIZE = 200;

const page: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", padding: 24 };
const toolbar: CSSProperties = { display: "flex", gap: 12, marginBottom: 16 };
const searchInput: CSSProperties = {
  flex: 1, padding: 8, border: "1px solid var(--ui-border)", borderRadius: 4,
  background: "var(--ui-surface-strong)", color: "var(--ui-text)",
};
const ownerSelect: CSSProperties = {
  minWidth: 180, padding: 8, border: "1px solid var(--ui-border)", borderRadius: 4,
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
const tagChip: CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)", whiteSpace: "nowrap" }; // BF_PORTAL_BLOCK_v811_TAGS_COLUMN
const activeChip: CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#16a34a", color: "#fff", whiteSpace: "nowrap", fontWeight: 600 };
const trStyle: CSSProperties = { borderBottom: "1px solid var(--ui-border-soft)" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "var(--ui-text-muted)" };
