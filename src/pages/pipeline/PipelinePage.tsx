import { useEffect, useState } from "react";
import { api } from "@/api";
import ApplicationCard from "../../components/pipeline/ApplicationCard";

const STAGE_ORDER = [
  "Received",
  "In Review",
  "Documents Required",
  "Additional Steps Required",
  "Off to Lender",
  "Offer",
  "Accepted",
  "Rejected",
];

const STAGE_COLORS: Record<string, string> = {
  "Received":                  "#6366f1",
  "In Review":                 "#f59e0b",
  "Documents Required":        "#ef4444",
  "Additional Steps Required": "#f97316",
  "Off to Lender":             "#3b82f6",
  "Offer":                     "#16a34a",
  "Accepted":                  "#15803d",
  "Rejected":                  "#6b7280",
};

type PipelineItem = {
  id: string;
  name: string | null;
  stage: string;
  updatedAt: string;
};

type KanbanColumn = {
  name: string;
  cards: PipelineItem[];
};

export default function PipelinePage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: PipelineItem[] }>("/api/pipeline")
      .then(({ items }) => {
        const map = new Map<string, PipelineItem[]>(
          STAGE_ORDER.map((s) => [s, []])
        );
        items.forEach((item) => {
          const stage = item.stage ?? "Received";
          if (!map.has(stage)) map.set(stage, []);
          map.get(stage)!.push(item);
        });
        setColumns(
          STAGE_ORDER.filter((s) => (map.get(s)?.length ?? 0) > 0 || ["Received", "In Review"].includes(s))
            .map((s) => ({ name: s, cards: map.get(s) ?? [] }))
        );
      })
      .catch(() => setError("Failed to load pipeline."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading pipeline...</div>;
  if (error) return <div style={{ padding: 32, color: "#ef4444" }}>{error}</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#0f172a" }}>Sales Pipeline</h1>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
        {columns.map((col) => (
          <div
            key={col.name}
            style={{
              minWidth: 280,
              background: "#0f172a",
              borderRadius: 10,
              padding: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: STAGE_COLORS[col.name] ?? "#94a3b8", margin: 0 }}>
                {col.name}
              </h3>
              <span style={{ fontSize: 12, color: "#64748b", background: "#1e293b", borderRadius: 12, padding: "2px 8px" }}>
                {col.cards.length}
              </span>
            </div>
            {col.cards.length === 0 ? (
              <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: "12px 0" }}>Empty</div>
            ) : (
              col.cards.map((card) => (
                <ApplicationCard key={card.id} card={{ id: card.id, company: card.name ?? "Unnamed", amount: "" }} />
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
