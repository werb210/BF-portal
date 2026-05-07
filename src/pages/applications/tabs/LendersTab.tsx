// BF_LENDERS_TAB_REAL_v42 — Block 42-B
// BF_LENDERS_TAB_FIX_v55_PORTAL — funding-range column
// BF_PORTAL_BLOCK_v179_LENDERS_TAB_GATING_ROUTED_v1 — envelope-based gating.
//
// Three states from /api/applications/:id/lenders/envelope:
//   locked  — required docs not all accepted; show outstanding list, no table
//   stale   — cache invalidated by a doc-reject; show amber banner + Recalc
//             button + dimmed cached matches
//   ready   — fresh cache; render the table normally
//
// matchLenders() runs ONCE on the server when the last required document is
// accepted (BF_SERVER_BLOCK_v198). This tab never causes a compute on its own
// except via the explicit Recalculate button.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLenderSubmission,
  fetchLenderEnvelope,
  recalculateLenderMatches,
  type LenderEnvelope,
  type LenderMatch,
} from "@/api/lenders";
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/hooks/useAuth";
import AccessRestricted from "@/components/auth/AccessRestricted";
import { canWrite } from "@/auth/can";

type Props = { applicationId?: string | null };

function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatRange(match: LenderMatch): string {
  const lo = (match as any).amountMin ?? null;
  const hi = (match as any).amountMax ?? null;
  if (lo === null && hi === null) return "—";
  return `${formatAmount(lo)} – ${formatAmount(hi)}`;
}

function formatLikelihood(match: LenderMatch): string {
  const raw =
    (match as any).matchPercent ??
    (match as any).matchPercentage ??
    (match as any).matchScore ??
    null;
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) {
    const rounded = n > 1 ? Math.round(n) : Math.round(n * 100);
    return `${rounded}%`;
  }
  const trimmed = String(raw).trim();
  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}

export default function LendersTab({ applicationId }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = canWrite((user as { role?: string | null } | null)?.role ?? null);
  const id = applicationId ?? "";

  const { data, isLoading, error } = useQuery<LenderEnvelope>({
    queryKey: ["lenders", id, "envelope"],
    queryFn: ({ signal }) => fetchLenderEnvelope(id, { signal }),
    enabled: Boolean(id),
  });

  const envelope: LenderEnvelope = data ?? {
    status: "locked",
    outstanding: [],
    computed_at: null,
    matches: [],
  };
  const matches = envelope.matches ?? [];

  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => selected.filter((s) => matches.some((m) => m.id === s)),
    [selected, matches],
  );

  const mutation = useMutation({
    mutationFn: (ids: string[]) => createLenderSubmission(id, ids),
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] });
    },
  });

  const toggle = (matchId: string) =>
    setSelected((cur) =>
      cur.includes(matchId) ? cur.filter((x) => x !== matchId) : [...cur, matchId],
    );

  const handleSend = async () => {
    if (sending || selectedIds.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      await mutation.mutateAsync(selectedIds);
    } catch (err) {
      setSendError(getErrorMessage(err, "Unable to send to lenders."));
    } finally {
      setSending(false);
    }
  };

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    setRecalcError(null);
    try {
      await recalculateLenderMatches(id);
      await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] });
    } catch (err) {
      setRecalcError(getErrorMessage(err, "Recalculate failed."));
    } finally {
      setRecalculating(false);
    }
  };

  if (!id)        return <div className="drawer-placeholder">Select an application to view lenders.</div>;
  if (isLoading)  return <div className="drawer-placeholder">Loading lenders…</div>;
  if (error)      return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load lenders.")}</div>;
  if (!canManage) return <AccessRestricted message="You do not have permission to view lender submissions." />;

  // ───── LOCKED ─────────────────────────────────────────────────────────────
  if (envelope.status === "locked") {
    return (
      <div data-testid="lenders-locked" style={{ padding: "16px 4px" }}>
        <div style={{
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: "20px 24px",
          maxWidth: 640,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
            Lender matching is locked
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
            Lender matches are computed once all required documents are accepted.
            Until then the financial inputs aren't stable enough to recommend lenders.
          </div>
          {envelope.outstanding.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 8 }}>
                Outstanding ({envelope.outstanding.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#0f172a" }}>
                {envelope.outstanding.map((c) => <li key={c} style={{ marginBottom: 4 }}>{c}</li>)}
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>
              Awaiting required-document list.
            </div>
          )}
        </div>
      </div>
    );
  }

  const isStale = envelope.status === "stale";

  // ───── STALE / READY ──────────────────────────────────────────────────────
  return (
    <div data-testid="lenders-tab" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {isStale && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fcd34d",
          color: "#78350f",
          borderRadius: 8,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 700 }}>⚠ Matches are stale</span>
          <span style={{ flex: 1 }}>
            A document was rejected after the last computation. Recalculate to refresh.
            {envelope.computed_at && (
              <span style={{ opacity: 0.7, marginLeft: 8 }}>
                Last computed: {new Date(envelope.computed_at).toLocaleString()}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            style={{
              background: recalculating ? "#fbbf24" : "#f59e0b",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: recalculating ? "default" : "pointer",
            }}
          >
            {recalculating ? "Recalculating…" : "Recalculate"}
          </button>
        </div>
      )}
      {recalcError && (
        <div role="alert" style={{ color: "#b91c1c", padding: 8, background: "#fef2f2", borderRadius: 6 }}>
          {recalcError}
        </div>
      )}
      {sendError && (
        <div role="alert" style={{ color: "#b91c1c", padding: 8, background: "#fef2f2", borderRadius: 6 }}>
          {sendError}
        </div>
      )}
      {matches.length === 0 ? (
        <div className="drawer-placeholder">
          {isStale
            ? "No cached matches available — click Recalculate to compute."
            : "No lender products match this application yet."}
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            opacity: isStale ? 0.7 : 1,
          }}
          aria-label="Lender list"
        >
          {matches.map((m) => {
            const checked = selected.includes(m.id);
            return (
              <li
                key={m.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr auto auto auto",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <strong>{(m as any).lenderName ?? "Unknown lender"}</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {(m as any).productName ?? ""}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  {(m as any).productCategory ?? "—"}
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  {formatRange(m)}
                </div>
                <div style={{ fontWeight: 600 }}>{formatLikelihood(m)}</div>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.id)}
                    disabled={sending || isStale}
                    aria-label={`Send to ${(m as any).lenderName ?? "lender"}`}
                  />
                  Send
                </label>
                <button type="button" disabled={sending || isStale} style={{ padding: "6px 12px" }}>
                  Upload Term Sheet
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || selectedIds.length === 0 || isStale}
          title={isStale ? "Recalculate before sending — matches are stale." : undefined}
          style={{
            padding: "8px 18px",
            background: selectedIds.length === 0 || isStale ? "#9ca3af" : "#2563eb",
            color: "#fff",
            border: 0,
            borderRadius: 6,
            cursor: selectedIds.length === 0 || isStale ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending…" : `Send (${selectedIds.length})`}
        </button>
      </div>
    </div>
  );
}
