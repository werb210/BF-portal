import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { crmApi, type CompanyRow } from "@/api/crm";
import { canDelete } from "@/auth/canDelete";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";

type SortCol = "name" | "industry" | "owner_name" | "created_at";

export default function CompaniesPage() {
  const { silo } = useSilo();
  const { user } = useAuth();
  const showDelete = canDelete(user?.role as any);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await crmApi.listCompanies({
          silo: String(silo).toLowerCase(),
          q,
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
  }, [silo, q, sort.col, sort.dir]);

  const onSort = (col: SortCol) =>
    setSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

  const sortIndicator = (col: SortCol) =>
    sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  const tableRows = useMemo(() => rows.map(r => (
    <tr key={r.id} style={trStyle}>
      <td style={tdStyle}>
        <Link to={`/crm/companies/${r.id}`} style={linkStyle}>{r.name}</Link>
      </td>
      <td style={tdStyle}>{r.industry ?? "—"}</td>
      <td style={tdStyle}>
        {(r.types_of_financing ?? []).map(t => (
          <span key={t} style={tag}>{t}</span>
        ))}
      </td>
      <td style={tdStyle}>{r.owner_name ?? "—"}</td>
      <td style={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
    </tr>
  )), [rows]);

  return (
    <div style={page}>
      <div style={toolbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies"
          style={searchInput}
        />
        <button style={toolbarBtn}>Export</button>
        <button style={toolbarBtn}>Edit columns</button>
      </div>

      <table style={table}>
        <thead>
          <tr style={theadRow}>
            <Th onClick={() => onSort("name")}>Company name{sortIndicator("name")}</Th>
            <Th onClick={() => onSort("industry")}>Industry{sortIndicator("industry")}</Th>
            <Th>Types of financing</Th>
            <Th onClick={() => onSort("owner_name")}>Owner{sortIndicator("owner_name")}</Th>
            <Th onClick={() => onSort("created_at")}>Create date{sortIndicator("created_at")}</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={5} style={emptyCell}>Loading…</td></tr>}
          {err && <tr><td colSpan={5} style={{ ...emptyCell, color: "#b00020" }}>{err}</td></tr>}
          {!loading && !err && rows.length === 0 && (
            <tr><td colSpan={5} style={emptyCell}>No companies in this silo.</td></tr>
          )}
          {!loading && !err && tableRows}
        </tbody>
      </table>
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
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const tag: CSSProperties = {
  display: "inline-block", background: "#cef7e6", color: "#0a6e57",
  padding: "2px 8px", borderRadius: 12, fontSize: 12, marginRight: 4, marginBottom: 2,
};
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
