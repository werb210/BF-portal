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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
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
        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contacts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, sort.col, sort.dir]);

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
        <button style={toolbarBtn} type="button" disabled title="Coming in v208">
          Export
        </button>
        <button style={toolbarBtn} type="button" disabled title="Coming in v208">
          Edit columns
        </button>
      </div>

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
          {err && (
            <tr>
              <td colSpan={5} style={{ ...emptyCell, color: "#b00020" }}>
                {err}
              </td>
            </tr>
          )}
          {!loading && !err && rows.length === 0 && (
            <tr>
              <td colSpan={5} style={emptyCell}>
                No BI contacts.
              </td>
            </tr>
          )}
          {!loading && !err && tableRows}
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
const searchInput: CSSProperties = {
  flex: 1,
  padding: 8,
  border: "1px solid #cbd6e2",
  borderRadius: 4,
  background: "#fff",
  color: "#000",
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
