import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLenderSubmission, fetchLenderMatches, type LenderMatch } from "@/api/lenders";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/hooks/useAuth";
import AccessRestricted from "@/components/auth/AccessRestricted";
import { canWrite } from "@/auth/can";
import { trackPortalEvent } from "@/lib/portalTracking";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
import { normalizeBusinessUnit } from "@/types/businessUnit";
import { BUSINESS_UNIT_CONFIG } from "@/config/businessUnitConfig";

const LendersTab = () => {
  const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeBusinessUnit } = useBusinessUnit();
  const businessUnit = normalizeBusinessUnit(activeBusinessUnit);
  const canSendToLender = BUSINESS_UNIT_CONFIG[businessUnit].allowLenderSend;
  const canManageSubmissions = canWrite((user as { role?: string | null } | null)?.role ?? null);

  const { data: matches = [], isLoading, error } = useQuery<LenderMatch[]>({
    queryKey: ["lenders", applicationId, "matches"],
    queryFn: ({ signal }) => fetchLenderMatches(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId)
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const mutation = useMutation({
    mutationFn: (lenderIds: string[]) => createLenderSubmission(applicationId ?? "", lenderIds),
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["lenders", applicationId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["lenders", applicationId, "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    }
  });

  const selectedLenders = useMemo(() => selected.filter((id) => matches.some((match) => match.id === id)), [selected, matches]);

  const getMatchLikelihood = (match: LenderMatch) => {
    const raw =
      match.matchPercentage ??
      match.matchPercent ??
      match.matchScore ??
      (match as { match_percentage?: number | string | null }).match_percentage ??
      (match as { match_percent?: number | string | null }).match_percent ??
      null;
    if (raw === null || raw === undefined || raw === "") return "—";
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isNaN(numeric)) {
      const rounded = numeric > 1 ? Math.round(numeric) : Math.round(numeric * 100);
      return `${rounded}%`;
    }
    const trimmed = String(raw).trim();
    return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
  };

  const toggleSelection = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const sendToLenders = async () => {
    await mutation.mutateAsync(selectedLenders);
  };

  const handleSend = async () => {
    if (sending || selectedLenders.length === 0) return;
    setSending(true);
    setSendError(null);
    if (applicationId) {
      const userId = (user as { id?: string | null } | null)?.id ?? "unknown";
      trackPortalEvent("lender_send_initiated", {
        application_id: applicationId,
        lenders_selected: selectedLenders.length,
        user_id: userId
      });
    }

    try {
      await sendToLenders();
    } catch (sendMutationError) {
      setSendError(getErrorMessage(sendMutationError, "Unable to send to lenders."));
    } finally {
      setSending(false);
    }
  };

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view lenders.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading lenders…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load lenders.")}</div>;
  if (!canManageSubmissions) return <AccessRestricted message="You do not have permission to view lender submissions." />;

  return (
    <div className="drawer-tab drawer-tab__lenders">
      {sendError ? (
        <div className="drawer-placeholder text-red-600" role="alert">
          {sendError}
        </div>
      ) : null}
      {matches.length ? (
        <ul className="drawer-list" aria-label="Lender list">
          {matches.map((match) => (
            <li key={match.id} className="lender-row">
              <div className="lender-row__meta">
                <div>Likelihood: {getMatchLikelihood(match)}</div>
              </div>
              <div className="lender-row__name">{match.lenderName ?? "Unknown lender"}</div>
              <label>
                Send
                <input
                  type="checkbox"
                  checked={selected.includes(match.id)}
                  onChange={() => toggleSelection(match.id)}
                  disabled={sending || !canSendToLender}
                />
              </label>
              <button type="button" className="btn btn--secondary" disabled={sending}>
                Upload Term Sheet
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="drawer-placeholder">No lenders available.</div>
      )}
      {!canSendToLender ? <div className="drawer-placeholder">Lender submissions are disabled for this business unit.</div> : null}
      <div className="drawer-footer-actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={handleSend}
          disabled={sending || selectedLenders.length === 0 || !canSendToLender}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
};

export default LendersTab;
