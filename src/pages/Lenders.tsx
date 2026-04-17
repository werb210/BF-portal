import { useEffect, useMemo, useState } from "react";
import { fetchClientLenders } from "@/api/lenders";
import Button from "@/components/ui/Button";

export default function Lenders() {
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const loadLenders = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchClientLenders();
      setRows(data);
    } catch {
      setErr("Failed to load lenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLenders();
  }, []);

  const formattedRows = useMemo(
    () =>
      rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        status: index % 3 === 0 ? "Inactive" : "Active",
        products: (index % 5) + 1
      })),
    [rows]
  );
  const filteredRows = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return formattedRows.filter((row) => {
      const matchesSearch = !normalized || row.name.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "all" ? true : row.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [formattedRows, searchQuery, statusFilter]);
  const hasRows = filteredRows.length > 0;

  if (err) return <div role="alert">{err}</div>;

  return (
    <div className="page lenders-page">
      <header className="lenders-page__header">
        <div>
          <h1>Lenders</h1>
          <p>Manage lender partners, products, and status.</p>
        </div>
        <Button type="button">Add lender</Button>
      </header>
      <div className="lenders-toolbar">
        <label className="ui-field">
          <span className="ui-field__label">Search</span>
          <input
            className="ui-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search lenders"
          />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select
            className="ui-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={loadLenders} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      {!hasRows && !loading && (
        <div className="ui-empty-state">
          <h3>No lenders yet</h3>
          <p>Add your first lender to start managing products and status.</p>
          <Button type="button">Add lender</Button>
        </div>
      )}
      {hasRows && (
        <div className="ui-table__wrapper">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Lender name</th>
                <th>Products</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.products}</td>
                  <td>
                    <span className={`status-pill status-pill--${row.status.toLowerCase()}`}>{row.status}</span>
                  </td>
                  <td className="user-actions">
                    <Button type="button" variant="ghost" className="user-actions__button">View</Button>
                    <Button type="button" variant="secondary" className="user-actions__button">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
