import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLenderSubmission, fetchLenderMatches } from "@/api/lenders";
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
    const canManageSubmissions = canWrite(user?.role ?? null);
    const { data: matches = [], isLoading, error } = useQuery({
        queryKey: ["lenders", applicationId, "matches"],
        queryFn: ({ signal }) => fetchLenderMatches(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId)
    });
    const [selected, setSelected] = useState([]);
    const [sendError, setSendError] = useState(null);
    const [sending, setSending] = useState(false);
    const mutation = useMutation({
        mutationFn: (lenderIds) => createLenderSubmission(applicationId ?? "", lenderIds),
        onSuccess: () => {
            setSelected([]);
            queryClient.invalidateQueries({ queryKey: ["lenders", applicationId, "matches"] });
            queryClient.invalidateQueries({ queryKey: ["lenders", applicationId, "submissions"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        }
    });
    const selectedLenders = useMemo(() => selected.filter((id) => matches.some((match) => match.id === id)), [selected, matches]);
    const getMatchLikelihood = (match) => {
        const raw = match.matchPercentage ??
            match.matchPercent ??
            match.matchScore ??
            match.match_percentage ??
            match.match_percent ??
            null;
        if (raw === null || raw === undefined || raw === "")
            return "—";
        const numeric = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isNaN(numeric)) {
            const rounded = numeric > 1 ? Math.round(numeric) : Math.round(numeric * 100);
            return `${rounded}%`;
        }
        const trimmed = String(raw).trim();
        return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
    };
    const toggleSelection = (id) => {
        setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    };
    const sendToLenders = async () => {
        await mutation.mutateAsync(selectedLenders);
    };
    const handleSend = async () => {
        if (sending || selectedLenders.length === 0)
            return;
        setSending(true);
        setSendError(null);
        if (applicationId) {
            const userId = user?.id ?? "unknown";
            trackPortalEvent("lender_send_initiated", {
                application_id: applicationId,
                lenders_selected: selectedLenders.length,
                user_id: userId
            });
        }
        try {
            await sendToLenders();
        }
        catch (sendMutationError) {
            setSendError(getErrorMessage(sendMutationError, "Unable to send to lenders."));
        }
        finally {
            setSending(false);
        }
    };
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view lenders." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading lenders\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load lenders.") });
    if (!canManageSubmissions)
        return _jsx(AccessRestricted, { message: "You do not have permission to view lender submissions." });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__lenders", children: [sendError ? (_jsx("div", { className: "drawer-placeholder text-red-600", role: "alert", children: sendError })) : null, matches.length ? (_jsx("ul", { className: "drawer-list", "aria-label": "Lender list", children: matches.map((match) => (_jsxs("li", { className: "lender-row", children: [_jsx("div", { className: "lender-row__meta", children: _jsxs("div", { children: ["Likelihood: ", getMatchLikelihood(match)] }) }), _jsx("div", { className: "lender-row__name", children: match.lenderName ?? "Unknown lender" }), _jsxs("label", { children: ["Send", _jsx("input", { type: "checkbox", checked: selected.includes(match.id), onChange: () => toggleSelection(match.id), disabled: sending || !canSendToLender })] }), _jsx("button", { type: "button", className: "btn btn--secondary", disabled: sending, children: "Upload Term Sheet" })] }, match.id))) })) : (_jsx("div", { className: "drawer-placeholder", children: "No lenders available." })), !canSendToLender ? _jsx("div", { className: "drawer-placeholder", children: "Lender submissions are disabled for this business unit." }) : null, _jsx("div", { className: "drawer-footer-actions", children: _jsx("button", { className: "btn btn--primary", type: "button", onClick: handleSend, disabled: sending || selectedLenders.length === 0 || !canSendToLender, children: sending ? "Sending…" : "Send" }) })] }));
};
export default LendersTab;
