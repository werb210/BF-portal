import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";

const STAGES = [
  "Received",
  "In Review",
  "Documents Required",
  "Additional Steps Required",
  "Off to Lender",
  "Offer",
  "Accepted",
  "Rejected",
] as const;

type Stage = typeof STAGES[number];

const LEGAL: Record<Stage, Stage[]> = {
  "Received": ["In Review", "Documents Required"],
  "In Review": ["Documents Required", "Additional Steps Required", "Off to Lender"],
  "Documents Required": ["In Review", "Additional Steps Required"],
  "Additional Steps Required": ["Off to Lender", "Documents Required"],
  "Off to Lender": ["Offer", "Accepted", "Rejected", "Documents Required"],
  Offer: ["Accepted", "Rejected", "Documents Required"],
  Accepted: [],
  Rejected: [],
};

const STAGE_SERVER: Record<Stage, string> = {
  Received: "RECEIVED",
  "In Review": "IN_REVIEW",
  "Documents Required": "DOCUMENTS_REQUIRED",
  "Additional Steps Required": "ADDITIONAL_STEPS_REQUIRED",
  "Off to Lender": "OFF_TO_LENDER",
  Offer: "OFFER",
  Accepted: "ACCEPTED",
  Rejected: "REJECTED",
};

const STAGE_FROM_SERVER: Record<string, Stage> = Object.fromEntries(
  Object.entries(STAGE_SERVER).map(([k, v]) => [v, k as Stage]),
);

const COLORS: Record<Stage, string> = {
  Received: "#6366f1",
  "In Review": "#f59e0b",
  "Documents Required": "#ef4444",
  "Additional Steps Required": "#f97316",
  "Off to Lender": "#3b82f6",
  Offer: "#16a34a",
  Accepted: "#15803d",
  Rejected: "#6b7280",
};

type Card = {
  id: string;
  name: string | null;
  business_legal_name?: string | null;
  pipeline_state: string;
  requested_amount?: number | null;
  created_at: string;
};

export default function PipelinePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api<{ items: Card[] }>("/api/portal/applications")
      .then(({ items }) => setCards(Array.isArray(items) ? items : []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveCard(cardId: string, nextStage: Stage) {
    setMoving(cardId);
    try {
      await api.patch(`/api/portal/applications/${cardId}/status`, {
        status: STAGE_SERVER[nextStage],
        reason: `Moved to ${nextStage}`,
      });
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, pipeline_state: STAGE_SERVER[nextStage] } : c)),
      );
    } catch {
      // no-op — leave card where it is
    } finally {
      setMoving(null);
    }
  }

  if (loading) return <div style={{ padding: 32, color: "#94a3b8" }}>Loading pipeline…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Sales Pipeline</h1>
        <span style={{ fontSize: 13, color: "#64748b" }}>{cards.length} applications</span>
      </div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {STAGES.map((stage) => {
          const stageCards = cards.filter((c) => (STAGE_FROM_SERVER[c.pipeline_state] ?? c.pipeline_state) === stage);
          return (
            <div key={stage} style={{ minWidth: 270, maxWidth: 270, flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  padding: "6px 2px",
                  borderBottom: `2px solid ${COLORS[stage]}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[stage] }}>{stage}</span>
                <span
                  style={{
                    fontSize: 11,
                    background: `${COLORS[stage]}22`,
                    color: COLORS[stage],
                    borderRadius: 20,
                    padding: "1px 8px",
                    fontWeight: 600,
                  }}
                >
                  {stageCards.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stageCards.map((card) => (
                  <PipelineCard
                    key={card.id}
                    card={card}
                    stage={stage}
                    moving={moving === card.id}
                    onOpen={() => navigate(`/applications/${card.id}`)}
                    onMove={(next) => moveCard(card.id, next)}
                  />
                ))}
                {stageCards.length === 0 && (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({
  card,
  stage,
  moving,
  onOpen,
  onMove,
}: {
  card: Card;
  stage: Stage;
  moving: boolean;
  onOpen: () => void;
  onMove: (next: Stage) => void;
}) {
  const [showMoves, setShowMoves] = useState(false);
  const transitions = LEGAL[stage] ?? [];
  const name = card.business_legal_name ?? card.name ?? "Unnamed";
  const amount = card.requested_amount ? `$${Number(card.requested_amount).toLocaleString()}` : null;
  const date = new Date(card.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 10,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: moving ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <div onClick={onOpen} style={{ cursor: "pointer", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", marginBottom: 4 }}>{name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
          {amount && <span>{amount}</span>}
          <span>{date}</span>
        </div>
      </div>

      {transitions.length > 0 && (
        <div>
          <button
            onClick={() => setShowMoves((v) => !v)}
            style={{
              width: "100%",
              fontSize: 11,
              padding: "4px 8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Move stage</span>
            <span>{showMoves ? "▲" : "▼"}</span>
          </button>
          {showMoves && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
              {transitions.map((next) => (
                <button
                  key={next}
                  disabled={moving}
                  onClick={() => {
                    setShowMoves(false);
                    onMove(next);
                  }}
                  style={{
                    width: "100%",
                    fontSize: 11,
                    padding: "5px 10px",
                    background: `${COLORS[next]}20`,
                    border: `1px solid ${COLORS[next]}44`,
                    borderRadius: 6,
                    color: COLORS[next],
                    cursor: moving ? "default" : "pointer",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  → {next}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
