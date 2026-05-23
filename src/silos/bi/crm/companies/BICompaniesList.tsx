// BF_PORTAL_BLOCK_v209_BI_COMPANIES_LIST_v1
// BI-side mirror of src/pages/crm/companies/CompaniesPage.tsx.
// Same table shape and styling. Columns adapted to BI's domain:
// Company name (with o/a operating_name), Industry, Contacts
// (count from v256 rollup), Location (city, province), Create date.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";

type SortCol = "name" | "industry" | "created_at";

type BICompanyRow = {
  id: string;
  legal_name: string;
  operating_name: string | null;
  business_number: string | null;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  industry: string | null;
  created_at: string;
  contact_count: number;
};

export default function BICompaniesList() {
  const [rows, setRows] = useState<BICompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({
    col: "created_at",
    dir: "desc",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Inline create state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
          `/api/v1/bi/crm/companies${params.toString() ? `?${params}` : ""}`,
        );
        const list: BICompanyRow[] = Array.isArray(r)
          ? r
          : Array.isArray(r?.data)
            ? r.data
            : [];
        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load companies.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, sort.col, sort.dir, refreshKey]);

  const onSort = (col: SortCol) =>
    setSort((s) => ({
      col,
      dir: s.col === col && s.dir === "asc" ? "desc" : "asc",
    }));

  const sortIndicator = (col: SortCol) =>
    sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  async function createCompany() {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api(`/api/v1/bi/crm/companies`, {
        method: "POST",
        body: {
          legal_name: newName.trim(),
          industry: newIndustry.trim() || null,
        },
      } as any);
      setNewName("");
      setNewIndustry("");
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setCreateError(e?.message ?? "Could not create company.");
    } finally {
      setCreating(false);
    }
  }

  const tableRows = useMemo(
    () =>
      rows.map((r) => (
        <tr key={r.id} style={trStyle} data-testid="bi-company-row">
          <td style={tdStyle}>
            <Link to={`/silo/bi/crm/companies/${r.id}`} style={linkStyle}>
              {r.legal_name}
            </Link>
            {r.operating_name && r.operating_name !== r.legal_name && (
              <div style={subtleCell}>o/a {r.operating_name}</div>
            )}
          </td>
          <td style={tdStyle}>{r.industry ?? "—"}</td>
          <td style={tdStyle}>{r.contact_count ?? 0}</td>
          <td style={tdStyle}>
            {[r.city, r.province].filter(Boolean).join(", ") || "—"}
          </td>
          <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
        </tr>
      )),
    [rows],
  );

  return (
    <div style={page} data-testid="bi-companies-list">
      <div style={toolbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies"
          style={searchInput}
          aria-label="Search companies"
        />
        {/* BF_PORTAL_BLOCK_v608_THREE_FIXES_v1 — record count */}
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 10px", whiteSpace: "nowrap" }} aria-live="polite">
          {rows.length} {rows.length === 1 ? "record" : "records"}
        </div>
        <span style={{ flex: 1 }} />
        <button style={toolbarBtn} type="button" disabled title="Coming in v211">
          Export
        </button>
        <button style={toolbarBtn} type="button" disabled title="Coming in v211">
          Edit columns
        </button>
        <button
          type="button"
          onClick={() => setCreateOpen((v) => !v)}
          style={{
            background: createOpen ? "#fff" : "#0d9b6c",
            color: createOpen ? "#0d9b6c" : "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            border: createOpen ? "1px solid #0d9b6c" : 0,
            cursor: "pointer",
          }}
          data-testid="bi-companies-create-toggle"
        >
          {createOpen ? "Cancel" : "+ Create Company"}
        </button>
      </div>

      {createOpen && (
        <div
          style={{
            background: "#f5f8fa",
            border: "1px solid #cbd6e2",
            borderRadius: 6,
            padding: 12,
            marginBottom: 16,
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
          }}
          data-testid="bi-companies-create-form"
        >
          <div style={{ flex: 2 }}>
            <div style={fieldLabel}>Legal name *</div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Acme Inc"
              style={{ ...searchInput, marginTop: 4 }}
              aria-label="Legal name"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={fieldLabel}>Industry</div>
            <input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="Optional"
              style={{ ...searchInput, marginTop: 4 }}
              aria-label="Industry"
            />
          </div>
          <button
            type="button"
            onClick={() => void createCompany()}
            disabled={creating || !newName.trim()}
            style={{
              background: "#0d9b6c",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 8,
              fontWeight: 600,
              border: 0,
              cursor: "pointer",
              opacity: creating || !newName.trim() ? 0.5 : 1,
            }}
          >
            {creating ? "Creating…" : "Create"}
          </button>
          {createError && (
            <span style={{ color: "#b00020", fontSize: 12 }} role="status">
              {createError}
            </span>
          )}
        </div>
      )}

      <table style={table}>
        <thead>
          <tr style={theadRow}>
            <Th onClick={() => onSort("name")}>Company name{sortIndicator("name")}</Th>
            <Th onClick={() => onSort("industry")}>Industry{sortIndicator("industry")}</Th>
            <Th>Contacts</Th>
            <Th>Location</Th>
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
                No BI companies.
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

// Styles mirrored from BF CompaniesPage / ContactsPage so the
// BI Companies and BI Contacts tabs share visual identity.
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
const subtleCell: CSSProperties = { color: "#7c98b6", fontSize: 12, marginTop: 2 };
const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "#7c98b6",
  textTransform: "uppercase",
};
