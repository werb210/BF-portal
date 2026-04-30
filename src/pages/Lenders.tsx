import { useEffect, useMemo, useState } from "react";
import { fetchClientLenders } from "@/api/lenders";
import CreateLenderModal from "@/pages/lenders/components/CreateLenderModal";

export default function Lenders() {
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadLenders = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchClientLenders();
      setRows(data);
      setActiveMap((prev) => {
        const next = { ...prev };
        data.forEach((row) => {
          if (next[row.id] === undefined) {
            next[row.id] = true;
          }
        });
        return next;
      });
    } catch {
      setErr("Failed to load lenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLenders();
  }, []);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  if (err) return <div role="alert">{err}</div>;

  return (
    <div>
      <h1>Lenders</h1>
      <button type="button" onClick={loadLenders} disabled={loading}>
        {loading ? "Loading..." : "Refresh"}
      </button>
      <button type="button" onClick={() => setShowCreateModal(true)} style={{ marginLeft: 8 }}>
        + Create New Lender
      </button>
      <CreateLenderModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          void loadLenders();
        }}
      />
      {!hasRows && !loading && <p>No lenders available.</p>}
      {hasRows && (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => setSelectedId(row.id)}>
                {row.name}
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={activeMap[row.id] ?? true}
                  onChange={(event) =>
                    setActiveMap((prev) => ({ ...prev, [row.id]: event.target.checked }))
                  }
                />
                Active
              </label>
              {selectedId === row.id && <span>Selected</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
