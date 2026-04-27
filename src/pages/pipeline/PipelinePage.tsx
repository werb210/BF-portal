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

function isDraftLikeApplication(card: Card): boolean {
  if (!card) return false;
  const name = String(card.business_legal_name ?? card.name ?? "").trim().toLowerCase();
  if (!name || name === "draft" || name === "draft application") return true;
  const dateMs = new Date(card.created_at).getTime();
  const invalidDate = Number.isNaN(dateMs);
  const state = String(card.pipeline_state ?? "").toLowerCase();
  return invalidDate && (state === "received" || state === "draft" || state === "new");
}

export default function PipelinePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api<{ items: Card[] }>("/api/portal/applications")
      .then(({ items }) => setCards(Array.isArray(items) ? items.filter((card) => !isDraftLikeApplication(card)) : []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function removeCard(cardId: string) {
    if (!window.confirm("Delete this application card? This cannot be undone.")) return;
    setDeleting(cardId);
    try {
      await api.delete(`/api/portal/applications/${cardId}`);
      setCards((prev) => prev.filter((card) => card.id !== cardId));
    } catch {
      window.alert("Delete failed. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

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
                    busy={acting === card.id || deleting === card.id}
                    onOpen={() => navigate(`/applications/${card.id}`)}
                    onMove={move}
                    onDelete={removeCard} />
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

function PipeCard({ card, stage, busy, onOpen, onMove, onDelete }: {
  card: Card; stage: Stage; busy: boolean;
  onOpen: () => void;
  onMove: (id: string, to: string) => void;
  onDelete: (id: string) => void;
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
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 3 }}><div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9" }}>{name}</div><button type="button" aria-label="Delete card" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} style={{ border: 0, background: "transparent", color: "#94a3b8", cursor: busy ? "default" : "pointer", fontSize: 18, lineHeight: 1 }} disabled={busy}>×</button></div>
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
