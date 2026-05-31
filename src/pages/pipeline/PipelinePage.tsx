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

type DocProgress = { accepted: number; rejected: number; pending: number; total: number };

type Card = {
  id: string;
  name: string | null;
  business_legal_name?: string | null;
  pipeline_state: string;
  requested_amount?: number | null;
  created_at: string;
  // v2 fields from /api/portal/applications enriched response (Block J):
  owner_user_id?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
  stage_entered_at?: string | null;
  doc_progress?: DocProgress;
  contact_name?: string | null;
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

// v696: every card must land in exactly one column, otherwise it inflates the
// header count without rendering (the "34 counted, 1 shown" bug). Any card whose
// pipeline_state isn't one of the known STAGES falls back to "Received", matching
// the existing null-state default.
function effectiveStage(card: Card): Stage {
  const raw = (card.pipeline_state ?? "Received") as Stage;
  return (STAGES as readonly string[]).includes(raw) ? raw : "Received";
}


function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function stageAge(iso: string | null | undefined): { label: string; warn: boolean } | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return null;
  return { label: `${days}d in stage`, warn: days >= 3 };
}

function initials(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim().charAt(0).toUpperCase();
  const l = (last ?? "").trim().charAt(0).toUpperCase();
  return (f + l) || "—";
}

function docProgressLabel(p: DocProgress | undefined): { text: string; color: string; bg: string } | null {
  if (!p || p.total === 0) return null;
  if (p.rejected > 0) {
    return { text: `${p.rejected} doc${p.rejected === 1 ? "" : "s"} rejected`, color: "#991b1b", bg: "#fee2e2" };
  }
  if (p.accepted === p.total) {
    return { text: `${p.total}/${p.total} docs`, color: "#166534", bg: "#dcfce7" };
  }
  return { text: `${p.accepted}/${p.total} docs`, color: "#92400e", bg: "#fef3c7" };
}

export default function PipelinePage() {
  // BF_PIPELINE_SHOW_DRAFTS_v24
  const [showDrafts, setShowDrafts] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    api<{ items: Card[] }>("/api/portal/applications", {
      params: showDrafts ? { include_drafts: 1 } : undefined,
    })
      .then(({ items }) => setCards(
        Array.isArray(items) ? items.filter((card) => !isDraftLikeApplication(card)) : [] // v699: junk drafts (no name / invalid) never count, even with show-drafts on
      ))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [showDrafts]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Sales Pipeline</h1>
          <label style={{ fontSize: 13, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={showDrafts} onChange={(event) => setShowDrafts(event.target.checked)} />
            Show drafts
          </label>
        </div>
        <span style={{ fontSize: 13, color: "#64748b" }}>{cards.length} applications</span>
      </div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {STAGES.map((stage) => {
          const col = cards.filter((c) => effectiveStage(c) === stage);
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
                    // BF_PORTAL_BLOCK_v188_PIPELINE_NAV_AND_AUTO_REVIEW_v1 — fire /open, optimistic-advance if Received, then navigate
                    onOpen={() => {
                      void api.post(`/api/portal/applications/${card.id}/open`, {}).catch(() => {});
                      if (card.pipeline_state === "Received") {
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, pipeline_state: "In Review" } : c))
                        );
                      }
                      navigate(`/applications/${card.id}`);
                    }}
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
  // BF_PORTAL_BLOCK_v175_CALL_CLIENT_BUTTON_v1
  // The pipeline card payload doesn't include phone (Card type only carries
  // id/name/state/amount/created_at). On Call click we fetch the application
  // details to pull applicantDetails.phone, then open the dialer pre-filled.
  const [callBusy, setCallBusy] = useState(false);
  const cardName = card.business_legal_name ?? card.name ?? "Unnamed";
  // BF_PORTAL_BLOCK_v225_DIALER_CLEAN_SLATE_v1 -- look up phone via API,
  // then hand off to the OS dialer with a tel: link.
  async function handleCall() {
    if (callBusy) return;
    setCallBusy(true);
    try {
      const payload: any = await api.get(`/api/applications/${card.id}/details`);
      const details = payload?.data ?? payload?.application ?? payload ?? null;
      const a = details?.applicantDetails ?? details?.applicantInfo ?? {};
      const phone = a?.phone ?? a?.phoneNumber ?? null;
      if (!phone) {
        window.alert("No phone number on file for this applicant.");
        return;
      }
      const { startOutboundPstn } = await import("@/dialer/actions");
      // v697: actually place the call (was only opening the panel, never dialing).
      void startOutboundPstn(String(phone), {
        applicationId: card.id,
        applicationName: cardName,
        contactName: [a?.firstName, a?.lastName].filter(Boolean).join(" ") || cardName,
        source: "pipeline",
      });
    } catch (err: any) {
      window.alert(`Could not look up phone: ${err?.message ?? "unknown error"}`);
    } finally {
      setCallBusy(false);
    }
  }
  const name = cardName;
  const amount = card.requested_amount
    ? `$${Number(card.requested_amount).toLocaleString()}` : null;
  const lastTouch = relativeTime(card.created_at);
  const stage_age = stageAge(card.stage_entered_at);
  const docPill = docProgressLabel(card.doc_progress);
  const ownerInitials = initials(card.owner_first_name, card.owner_last_name);
  const hasOwner = Boolean(card.owner_user_id);
  const ownerTitle = [card.owner_first_name, card.owner_last_name].filter(Boolean).join(" ");

  const btnBase: React.CSSProperties = {
    flex: 1, fontSize: 11, padding: "5px 0", borderRadius: 6,
    cursor: busy ? "default" : "pointer", fontWeight: 700, border: "1px solid",
  };

  return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: 12,
      border: stage_age?.warn ? "1px solid #f59e0b80" : "1px solid rgba(255,255,255,0.06)",
      opacity: busy ? 0.6 : 1, transition: "opacity 0.15s" }}>

      {/* Header: name + call/delete buttons */}
      <div onClick={onOpen} style={{ cursor: "pointer", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            {card.contact_name && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.contact_name}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button type="button" aria-label="Call client" title={callBusy ? "Looking up phone…" : "Call client"}
              onClick={(e) => { e.stopPropagation(); void handleCall(); }}
              disabled={busy || callBusy}
              style={{ border: 0, background: "transparent", color: callBusy ? "#475569" : "#94a3b8", cursor: (busy || callBusy) ? "default" : "pointer", padding: "4px 6px", display: "inline-flex", alignItems: "center", borderRadius: 4 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
              </svg>
            </button>
            <button type="button" aria-label="Delete card" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} disabled={busy}
              style={{ border: 0, background: "transparent", color: "#94a3b8", cursor: busy ? "default" : "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Amount + owner row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{amount ?? "—"}</span>
          {hasOwner && (
            <span title={ownerTitle || "Owner"} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, background: "#334155", color: "#e2e8f0", fontSize: 9, fontWeight: 700 }}>{ownerInitials}</span>
          )}
        </div>

        {/* Pills row: doc progress, stage age */}
        {(docPill || stage_age) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {docPill && (
              <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: docPill.bg, color: docPill.color }}>
                {docPill.text}
              </span>
            )}
            {stage_age && (
              <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                background: stage_age.warn ? "#fef3c7" : "#1e293b", color: stage_age.warn ? "#92400e" : "#94a3b8", border: stage_age.warn ? "0" : "1px solid #475569" }}>
                {stage_age.label}
              </span>
            )}
          </div>
        )}

        {/* Footer: last touch */}
        {lastTouch && (
          <div style={{ fontSize: 10, color: "#64748b" }}>{lastTouch}</div>
        )}
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
