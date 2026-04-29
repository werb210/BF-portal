// BF_LENDERS_TAB_REAL_v42 — Block 42-B
// Real Lenders tab replacing the prior placeholder panel. Implements
// the V1 spec UI: each row shows lender name, likelihood %, a "Send" checkbox
// and an Upload Term Sheet button. The bottom action sends the selected
// lender_product_ids to /api/portal/lender-submissions.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLenderSubmission,
  fetchLenderMatches,
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

  const { data: matches = [], isLoading, error } = useQuery<LenderMatch[]>({
    queryKey: ["lenders", id, "matches"],
    queryFn: ({ signal }) => fetchLenderMatches(id, { signal }),
    enabled: Boolean(id),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => selected.filter((s) => matches.some((m) => m.id === s)),
    [selected, matches],
  );

  const mutation = useMutation({
    mutationFn: (ids: string[]) => createLenderSubmission(id, ids),
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["lenders", id, "matches"] });
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

  if (!id)        return <div className="drawer-placeholder">Select an application to view lenders.</div>;
  if (isLoading)  return <div className="drawer-placeholder">Loading lenders…</div>;
  if (error)      return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load lenders.")}</div>;
  if (!canManage) return <AccessRestricted message="You do not have permission to view lender submissions." />;

  return (
    <div data-testid="lenders-tab" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sendError && (
        <div role="alert" style={{ color: "#b91c1c", padding: 8, background: "#fef2f2", borderRadius: 6 }}>
          {sendError}
        </div>
      )}
      {matches.length === 0 ? (
        <div className="drawer-placeholder">No lender products match this application yet.</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }} aria-label="Lender list">
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
                  // BF_LENDERS_TAB_FIX_v55_PORTAL — added funding-range column
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
                    disabled={sending}
                    aria-label={`Send to ${(m as any).lenderName ?? "lender"}`}
                  />
                  Send
                </label>
                <button type="button" disabled={sending} style={{ padding: "6px 12px" }}>
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
          disabled={sending || selectedIds.length === 0}
          style={{
            padding: "8px 18px",
            background: selectedIds.length === 0 ? "#9ca3af" : "#2563eb",
            color: "#fff",
            border: 0,
            borderRadius: 6,
            cursor: selectedIds.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Sending…" : `Send (${selectedIds.length})`}
        </button>
      </div>
    </div>
  );
}
