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
  "Rejected"
];

const STAGE_COLORS: Record<string, string> = {
  Received: "#6366f1",
  "In Review": "#f59e0b",
  "Documents Required": "#ef4444",
  "Additional Steps Required": "#f97316",
  "Off to Lender": "#3b82f6",
  Offer: "#16a34a",
  Accepted: "#15803d",
  Rejected: "#6b7280"
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
        const map = new Map<string, PipelineItem[]>(STAGE_ORDER.map((s) => [s, []]));
        items.forEach((item) => {
          const stage = item.stage ?? "Received";
          if (!map.has(stage)) map.set(stage, []);
          map.get(stage)?.push(item);
        });
        setColumns(STAGE_ORDER.map((s) => ({ name: s, cards: map.get(s) ?? [] })));
      })
      .catch(() => setError("Failed to load pipeline."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading pipeline...</div>;
  if (error) return <div style={{ padding: 32, color: "#ef4444" }}>{error}</div>;

  return (
    <div className="page pipeline-page-v2">
      <div>
        <h1 className="text-2xl font-semibold">Sales Pipeline</h1>
        <p className="text-sm text-slate-500">Drag applications across stages to keep the pipeline moving.</p>
      </div>

      <div className="pipeline-scroll">
        {columns.map((col) => (
          <section key={col.name} className="pipeline-stage" aria-label={`${col.name} stage`}>
            <header className="pipeline-stage__header">
              <h3 style={{ color: STAGE_COLORS[col.name] ?? "#94a3b8" }}>{col.name}</h3>
              <span className="pipeline-stage__count">{col.cards.length}</span>
            </header>
            <div className="pipeline-stage__body">
              {col.cards.length === 0 ? (
                <div className="ui-empty-state ui-empty-state--compact">
                  <div className="ui-empty-state__icon" aria-hidden="true">🗂️</div>
                  <p>No applications in this stage</p>
                  <button type="button" className="ui-button ui-button--secondary">
                    Add Application
                  </button>
                </div>
              ) : (
                col.cards.map((card) => (
                  <ApplicationCard key={card.id} card={{ id: card.id, company: card.name ?? "Unnamed", amount: "" }} />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
