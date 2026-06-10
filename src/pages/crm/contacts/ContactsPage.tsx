import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { crmApi, type ContactRow } from "@/api/crm";
import { canDelete } from "@/auth/canDelete";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { useCrmStore } from "@/state/crm.store";
import CreateContactModal from "./CreateContactModal";
import ImportContactsModal from "./ImportContactsModal";

type SortCol = "name" | "company_name" | "lead_status" | "owner_name" | "created_at";

export default function ContactsPage() {
  const { silo } = useSilo();
  const { user } = useAuth();
  const showDelete = canDelete(user?.role as any);
  const isAdmin = user?.role === "Admin";
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]);
  const [ownerId, setOwnerId] = useState("");
  const [tagFilter, setTagFilter] = useState(""); // BF_PORTAL_BLOCK_v806_TAG_FILTER
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [busyMass, setBusyMass] = useState<"delete" | "tag" | "active" | "assign" | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");

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
        const r = await crmApi.listContacts({
          silo: String(silo).toLowerCase(),
          // v193_contact_search: server reads `search` not `q`.
          search: q,
          q,
          sort: `${sort.col}:${sort.dir}`,
          owner_id: ownerId || undefined,
          tag: tagFilter || undefined, // BF_PORTAL_BLOCK_v806_TAG_FILTER
        });
        if (!cancelled) setRows(Array.isArray(r) ? r : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contacts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [silo, q, sort.col, sort.dir, ownerId, tagFilter, refreshKey]);

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
        <Link to={`/crm/contacts/${r.id}`} style={linkStyle}>{r.name || "(no name)"}</Link>
      </td>
      <td style={tdStyle}>{r.company_name ?? "—"}</td>
      <td style={tdStyle}>{/* BF_PORTAL_BLOCK_v811_TAGS_COLUMN */}
        {r.tags && r.tags.length ? (
          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
            {r.tags.map((t) => (
              <span key={t} style={t.toLowerCase() === "active" ? activeChip : tagChip}>{t}</span>
            ))}
          </span>
        ) : "—"}
      </td>
      <td style={tdStyle}>{(
        r.lead_status === "applicant" ||
        ((r as any).types_of_financing ?? []).includes("APPLICANT") ||
        Number((r as any).applications_count ?? 0) > 0
          ? "Applicant"
          : r.lead_status === "lender"
          ? "Lender"
          : (r.lead_status ?? "New")
      )}</td>
      <td style={tdStyle}>{r.owner_name ?? "—"}</td>
      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
    </tr>
  )), [isAdmin, rows, selected]);

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
        <button style={toolbarBtn}>Export</button>
        <button style={toolbarBtn}>Edit columns</button>
        <button onClick={() => setImportOpen(true)} style={toolbarBtn}>Import</button>
        <button onClick={() => setCreateOpen(true)} style={{ background: "#0d9b6c", color: "white", padding: "8px 14px", borderRadius: 8, fontWeight: 600, border: 0 }}>+ Create Contact</button>
      </div>
      {isAdmin && selected.size > 0 && (
        <div style={{ display: "flex", gap: 8, padding: 12, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.size} selected</span>
          <button disabled={busyMass !== null} onClick={massDelete} style={{ padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "delete" ? "Deleting…" : "Delete"}</button>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Tag name" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
          <button disabled={busyMass !== null || !tagInput.trim()} onClick={massTag} style={{ padding: "6px 12px", borderRadius: 6, background: "#2563eb", color: "#fff", border: 0, cursor: tagInput.trim() ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "tag" ? "Tagging…" : "Apply tag"}</button>
          <button disabled={busyMass !== null} onClick={() => void tagActive()} title='Tag selected contacts as "active"' style={{ padding: "6px 12px", borderRadius: 6, background: "#16a34a", color: "#fff", border: 0, cursor: "pointer", fontSize: 13 }}>{busyMass === "active" ? "Tagging…" : "Tag Active"}</button>
          <select value={assignOwnerId} onChange={(e) => setAssignOwnerId(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, background: "#fff" }}>
            <option value="">Assign owner…</option>
            {owners.map((o) => (<option key={o.id} value={o.id}>{`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.id}</option>))}
          </select>
          <button disabled={busyMass !== null || !assignOwnerId} onClick={massAssign} style={{ padding: "6px 12px", borderRadius: 6, background: "#0d9b6c", color: "#fff", border: 0, cursor: assignOwnerId ? "pointer" : "not-allowed", fontSize: 13 }}>{busyMass === "assign" ? "Assigning…" : "Assign"}</button>
          <button onClick={() => setSelected(new Set())} style={{ padding: "6px 12px", borderRadius: 6, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: 13 }}>Clear</button>
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
            <Th onClick={() => onSort("name")}>Name{sortIndicator("name")}</Th>
            <Th onClick={() => onSort("company_name")}>Company{sortIndicator("company_name")}</Th>
            <Th>Tags</Th>{/* BF_PORTAL_BLOCK_v811_TAGS_COLUMN */}
            <Th onClick={() => onSort("lead_status")}>Lead status{sortIndicator("lead_status")}</Th>
            <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>
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

const page: CSSProperties = { background: "#fff", color: "#000", padding: 24 };
const toolbar: CSSProperties = { display: "flex", gap: 12, marginBottom: 16 };
const searchInput: CSSProperties = {
  flex: 1, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4,
  background: "#fff", color: "#000",
};
const ownerSelect: CSSProperties = {
  minWidth: 180, padding: 8, border: "1px solid #cbd6e2", borderRadius: 4,
  background: "#fff", color: "#000",
};
const toolbarBtn: CSSProperties = {
  padding: "8px 16px", border: "1px solid #cbd6e2", background: "#fff",
  borderRadius: 4, cursor: "pointer",
};
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fff" };
const theadRow: CSSProperties = { borderBottom: "1px solid #cbd6e2", background: "#f5f8fa" };
const thStyle: CSSProperties = {
  padding: 12, textAlign: "left", cursor: "pointer", color: "#33475b",
  textTransform: "uppercase", fontSize: 12, userSelect: "none",
};
const tdStyle: CSSProperties = { padding: 12, color: "#000" };
const tagChip: CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#eef2f7", color: "#334155", whiteSpace: "nowrap" }; // BF_PORTAL_BLOCK_v811_TAGS_COLUMN
const activeChip: CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#16a34a", color: "#fff", whiteSpace: "nowrap", fontWeight: 600 };
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
