import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { crmApi, type ContactRow } from "@/api/crm";
import { useSilo } from "@/hooks/useSilo";
import { useCrmStore } from "@/state/crm.store";

type SortCol = "name" | "company_name" | "lead_status" | "owner_name" | "created_at";

export default function ContactsPage() {
  const { silo } = useSilo();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [q, setQ] = useState("");
  const [owners, setOwners] = useState<Array<{ id: string; first_name?: string; last_name?: string }>>([]);
  const [ownerId, setOwnerId] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" }>({ col: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
          q,
          sort: `${sort.col}:${sort.dir}`,
          owner_id: ownerId || undefined,
        });
        if (!cancelled) setRows(Array.isArray(r) ? r : []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Could not load contacts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [silo, q, sort.col, sort.dir, ownerId]);

  const onSort = (col: SortCol) =>
    setSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));

  const sortIndicator = (col: SortCol) =>
    sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";

  const tableRows = useMemo(() => rows.map(r => (
    <tr key={r.id} style={trStyle}>
      <td style={tdStyle}>
        <Link to={`/crm/contacts/${r.id}`} style={linkStyle}>{r.name || "(no name)"}</Link>
      </td>
      <td style={tdStyle}>{r.company_name ?? "—"}</td>
      <td style={tdStyle}>{r.lead_status ?? "—"}</td>
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
        <button style={toolbarBtn}>Export</button>
        <button style={toolbarBtn}>Edit columns</button>
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
          {loading && <tr><td colSpan={5} style={emptyCell}>Loading…</td></tr>}
          {err && <tr><td colSpan={5} style={{ ...emptyCell, color: "#b00020" }}>{err}</td></tr>}
          {!loading && !err && rows.length === 0 && (
            <tr><td colSpan={5} style={emptyCell}>No contacts in this silo.</td></tr>
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
const trStyle: CSSProperties = { borderBottom: "1px solid #eaf0f6" };
const linkStyle: CSSProperties = { color: "#0091ae", textDecoration: "none" };
const emptyCell: CSSProperties = { padding: 24, textAlign: "center", color: "#7c98b6" };
