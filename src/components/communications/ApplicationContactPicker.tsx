import { useState, useEffect } from "react";
import { api } from "@/api";

interface Props {
  onSelect: (contactId: string) => void;
}

type AppRow = { id: string; name: string | null; pipeline_state: string };

export default function ApplicationContactPicker({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ items: AppRow[] }>(`/api/pipeline`)
        .then(({ items }) => {
          const q = query.toLowerCase();
          setResults(items.filter((a) => (a.name ?? "").toLowerCase().includes(q)).slice(0, 8));
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search application or company..."
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#fff",
          fontSize: 13,
          boxSizing: "border-box"
        }}
      />
      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            zIndex: 50,
            maxHeight: 200,
            overflowY: "auto"
          }}
        >
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                onSelect(r.id);
                setQuery(r.name ?? r.id);
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 13,
                color: "#cbd5e1",
                borderBottom: "1px solid #0f172a"
              }}
            >
              {r.name ?? "Unnamed"} <span style={{ color: "#64748b", fontSize: 11 }}>· {r.pipeline_state}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
