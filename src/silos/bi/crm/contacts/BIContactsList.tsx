// BF_PORTAL_BLOCK_v206_BI_CONTACTS_LIST_v1
// BI-side mirror of src/pages/crm/contacts/ContactsPage.tsx.
// Same table shape, same sort indicators, same light-theme
// HubSpot styling. Backed by BI-Server v254 enhanced
// /api/v1/bi/crm/contacts endpoint which joins bi_companies for
// company_name and supports search + sort + pagination.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";

type SortCol = "name" | "company_name" | "lead_status" | "owner_name" | "created_at";

type BIContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_e164: string | null;
  title: string | null;
  company_id: string | null;
  company_name: string | null;
  outreach_status: string | null;
  outreach_owner_id: string | null;
  outreach_updated_at: string | null;
  tags: string[] | null;
  created_at: string;
};

export default function BIContactsList() {
  const [rows, setRows] = useState<BIContactRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({
    col: "created_at",
    dir: "desc",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setLoadFailed(false);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
        params.set("sort", `${sort.col}:${sort.dir}`);
        const r: any = await api(
          `/api/v1/bi/crm/contacts${params.toString() ? `?${params}` : ""}`,
        );
        // BI-Server returns rows directly (via ok helper); the api
        // wrapper unwraps { data: ... } so we get the array.
        const list: BIContactRow[] = Array.isArray(r)
          ? r
          : Array.isArray(r?.data)
            ? r.data
            : [];
        if (!cancelled) {
          const listItems: BIContactRow[] = Array.isArray(r)
            ? r
            : Array.isArray(r?.items)
              ? r.items
              : Array.isArray(r?.data)
                ? r.data
                : [];
          setRows(listItems);
        }
      } catch (e: any) {
        if (!cancelled) {
          const code = e?.message ?? "unknown_error";
          setErr(`Could not load contacts. Please refresh. (${code})`);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, selectedTags, sort.col, sort.dir]);

  const availableTags = useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap((row) =>
            Array.isArray(row.tags)
              ? row.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
              : [],
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const onSort = (col: SortCol) =>
    setSort((s) => ({
      col,
      dir: s.col === col && s.dir === "asc" ? "desc" : "asc",
    }));

  const sortIndicator = (col: SortCol) =>
    sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  const tableRows = useMemo(
    () =>
      rows.map((r) => (
        <tr key={r.id} style={trStyle} data-testid="bi-contact-row">
          <td style={tdStyle}>
            <Link to={`/silo/bi/crm/contacts/${r.id}`} style={linkStyle}>
              {r.full_name || "(no name)"}
            </Link>
          </td>
          <td style={tdStyle}>{r.company_name ?? "—"}</td>
          <td style={tdStyle}>
            {r.outreach_status ? r.outreach_status.replace(/_/g, " ") : "—"}
          </td>
          <td style={tdStyle}>{r.outreach_owner_id ?? "—"}</td>
          <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
        </tr>
      )),
    [rows],
  );

  return (
    <div style={page} data-testid="bi-contacts-list">
      <div style={toolbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search contacts"
          style={searchInput}
          aria-label="Search contacts"
        />
        <span style={{ flex: 1 }} />
        <div style={filterDropdownWrap}>
          <button style={filterBtn} type="button" onClick={() => setIsTagsOpen((o) => !o)}>
            Tags{selectedTags.length ? ` (${selectedTags.length})` : ""}
          </button>
          {isTagsOpen && (
            <div style={dropdownMenu}>
              {availableTags.length === 0 && <div style={dropdownEmpty}>No tags available.</div>}
              {availableTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    style={{ ...tagChipBtn, ...(selected ? tagChipBtnActive : null) }}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button style={toolbarBtn} type="button" disabled title="Coming in v208">
          Export
        </button>
        <button style={toolbarBtn} type="button" disabled title="Coming in v208">
          Edit columns
        </button>
      </div>

      {selectedTags.length > 0 && (
        <div style={activeFilterRow}>
          {selectedTags.map((tag) => (
            <button key={tag} type="button" style={activeTagChip} onClick={() => toggleTag(tag)}>
              {tag} ×
            </button>
          ))}
        </div>
      )}

      <table style={table}>
        <thead>
          <tr style={theadRow}>
            <Th onClick={() => onSort("name")}>Name{sortIndicator("name")}</Th>
            <Th onClick={() => onSort("company_name")}>Company{sortIndicator("company_name")}</Th>
            <Th onClick={() => onSort("lead_status")}>Lead status{sortIndicator("lead_status")}</Th>
            <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} style={emptyCell}>
                Loading…
              </td>
            </tr>
          )}
          {loadFailed && (
            <tr>
              <td colSpan={5} style={{ ...emptyCell, color: "#b00020" }}>
                {err ?? "Could not load contacts. Please refresh."}
              </td>
            </tr>
          )}
          {!loading && !loadFailed && rows.length === 0 && (
            <tr>
              <td colSpan={5} style={emptyCell}>
                No BI contacts yet. Contacts will appear here as leads come in.
              </td>
            </tr>
          )}
          {!loading && !loadFailed && tableRows}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th onClick={onClick} style={thStyle}>
      {children}
    </th>
  );
}

// Styles mirrored from BF ContactsPage so the visual identity is
// identical (HubSpot light theme on a white card).
const page: CSSProperties = { background: "#fff", color: "#000", padding: 24, borderRadius: 8 };
const toolbar: CSSProperties = { display: "flex", gap: 12, marginBottom: 16 };
const activeFilterRow: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};
const searchInput: CSSProperties = {
  flex: 1,
  padding: 8,
  border: "1px solid #cbd6e2",
  borderRadius: 4,
  background: "#fff",
  color: "#000",
};
const filterDropdownWrap: CSSProperties = { position: "relative" };
const filterBtn: CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #cbd6e2",
  borderRadius: 4,
  background: "#fff",
  color: "#33475b",
  cursor: "pointer",
};
const dropdownMenu: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: 240,
  maxWidth: 320,
  padding: 10,
  border: "1px solid #cbd6e2",
  borderRadius: 6,
  background: "#fff",
  boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  zIndex: 20,
};
const dropdownEmpty: CSSProperties = { color: "#7c98b6", fontSize: 13 };
const tagChipBtn: CSSProperties = {
  border: "1px solid #cbd6e2",
  borderRadius: 999,
  padding: "4px 10px",
  background: "#fff",
  color: "#33475b",
  cursor: "pointer",
  fontSize: 12,
};
const tagChipBtnActive: CSSProperties = {
  background: "#e5f5f8",
  borderColor: "#0091ae",
  color: "#006d87",
};
const activeTagChip: CSSProperties = {
  ...tagChipBtn,
  ...tagChipBtnActive,
};
const toolbarBtn: CSSProperties = {
  padding: "8px 16px",
  border: "1px solid #cbd6e2",
  background: "#fff",
  borderRadius: 4,
  cursor: "pointer",
  opacity: 0.5,
};
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fff" };
const theadRow: CSSProperties = { borderBottom: "1px solid #cbd6e2", background: "#f5f8fa" };
const thStyle: CSSProperties = {
  padding: 12,
  textAlign: "left",
  cursor: "pointer",
  color: "#33475b",
  textTransform: "uppercase",
  fontSize: 12,
  userSelect: "none",
};
const tdStyle: CSSProperties = { padding: 12, color: "#000" };
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
