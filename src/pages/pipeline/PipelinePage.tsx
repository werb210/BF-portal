import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";

const STAGES = [
  "Received", "In Review", "Documents Required",
  "Additional Steps Required", "Off to Lender",
  "Offer", "Accepted", "Rejected",
] as const;

type Stage = typeof STAGES[number];

const COLORS: Record<Stage, string> = {
  "Received":                  "#6366f1",
  "In Review":                 "#f59e0b",
  "Documents Required":        "#ef4444",
  "Additional Steps Required": "#f97316",
  "Off to Lender":             "#3b82f6",
  "Offer":                     "#16a34a",
  "Accepted":                  "#15803d",
  "Rejected":                  "#6b7280",
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
  const [acting, setActing] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api<{ items: Card[] }>("/api/portal/applications")
      .then(({ items }) => setCards(Array.isArray(items) ? items : []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function move(cardId: string, toStage: string) {
    setActing(cardId);
    try {
      await api.patch(`/api/portal/applications/${cardId}/status`, {
        status: toStage, reason: `Manually set to ${toStage}`,
      });
      setCards((prev) =>
        prev.map((c) => c.id === cardId ? { ...c, pipeline_state: toStage } : c)
      );
    } catch { /* leave in place */ } finally { setActing(null); }
  }

  if (loading) return (
    <div style={{ padding: 32, color: "#94a3b8", fontSize: 14 }}>Loading pipeline…</div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Sales Pipeline</h1>
        <span style={{ fontSize: 13, color: "#64748b" }}>{cards.length} applications</span>
      </div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {STAGES.map((stage) => {
          const col = cards.filter((c) => (c.pipeline_state ?? "Received") === stage);
          return (
            <div key={stage} style={{ minWidth: 260, maxWidth: 260, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                padding: "6px 2px", borderBottom: `2px solid ${COLORS[stage]}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[stage] }}>{stage}</span>
                <span style={{ fontSize: 11, background: COLORS[stage] + "22", color: COLORS[stage],
                  borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>
                  {col.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.map((card) => (
                  <PipeCard key={card.id} card={card} stage={stage}
                    busy={acting === card.id}
                    onOpen={() => navigate(`/applications/${card.id}`)}
                    onMove={move} />
                ))}
                {col.length === 0 && (
                  <div style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "14px 0" }}>
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipeCard({ card, stage, busy, onOpen, onMove }: {
  card: Card; stage: Stage; busy: boolean;
  onOpen: () => void;
  onMove: (id: string, to: string) => void;
}) {
  const name = card.business_legal_name ?? card.name ?? "Unnamed";
  const amount = card.requested_amount
    ? `$${Number(card.requested_amount).toLocaleString()}` : null;
  const date = new Date(card.created_at).toLocaleDateString("en-CA",
    { month: "short", day: "numeric" });

  const btnBase: React.CSSProperties = {
    flex: 1, fontSize: 11, padding: "5px 0", borderRadius: 6,
    cursor: busy ? "default" : "pointer", fontWeight: 700, border: "1px solid",
  };

  return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: 12,
      border: "1px solid rgba(255,255,255,0.06)",
      opacity: busy ? 0.6 : 1, transition: "opacity 0.15s" }}>

      {/* Click anywhere on the card header to open */}
      <div onClick={onOpen} style={{ cursor: "pointer", marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", marginBottom: 3 }}>{name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
          {amount && <span>{amount}</span>}
          <span>{date}</span>
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>
          Click to open · auto-advances on actions
        </div>
      </div>

      {/* Request Additional Steps — only on In Review or Documents Required */}
      {(stage === "In Review" || stage === "Documents Required") && (
        <button disabled={busy} onClick={() => onMove(card.id, "Additional Steps Required")}
          style={{ ...btnBase, width: "100%", flex: "unset",
            background: "#f97316" + "18", borderColor: "#f97316" + "55",
            color: "#f97316", marginBottom: 0, textAlign: "left", paddingLeft: 8 }}>
          ↗ Request additional steps
        </button>
      )}

      {/* Accept / Reject — only on Offer */}
      {stage === "Offer" && (
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <button disabled={busy} onClick={() => onMove(card.id, "Accepted")}
            style={{ ...btnBase, background: "#15803d18", borderColor: "#15803d55", color: "#15803d" }}>
            ✓ Accept
          </button>
          <button disabled={busy} onClick={() => onMove(card.id, "Rejected")}
            style={{ ...btnBase, background: "#ef444418", borderColor: "#ef444455", color: "#ef4444" }}>
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );
}
