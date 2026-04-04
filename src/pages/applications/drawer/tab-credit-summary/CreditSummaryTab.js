import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCreditSummary } from "@/api/credit";
import { useApplicationDrawerStore } from "@/state/applicationDrawer.store";
import { getErrorMessage } from "@/utils/errors";
import { trackPortalEvent } from "@/lib/portalTracking";
import { useAuth } from "@/hooks/useAuth";
const ReadOnlyView = ({ content }) => _jsx("div", { children: content?.trim() ? content : "—" });
const RichTextEditor = ({ content }) => _jsx("div", { children: content?.trim() ? content : "—" });
const CreditSummaryTab = () => {
    const applicationId = useApplicationDrawerStore((state) => state.selectedApplicationId);
    const trackedApplicationIdRef = useRef(null);
    const { user } = useAuth();
    const { data: creditSummary, isLoading, error } = useQuery({
        queryKey: ["credit", applicationId],
        queryFn: ({ signal }) => fetchCreditSummary(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId)
    });
    useEffect(() => {
        if (!applicationId || !creditSummary)
            return;
        if (trackedApplicationIdRef.current === applicationId)
            return;
        const userId = user?.id ?? "unknown";
        trackPortalEvent("staff_action", {
            user_id: userId,
            action_type: "credit_summary_generate",
            application_id: applicationId
        });
        trackPortalEvent("credit_summary_generated", {
            application_id: applicationId,
            user_id: userId
        });
        trackedApplicationIdRef.current = applicationId;
    }, [applicationId, creditSummary, user]);
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view credit summary." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading credit summary\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load credit summary.") });
    const isLocked = creditSummary?.status === "submitted";
    return (_jsxs("div", { className: "drawer-tab drawer-tab__credit", children: [_jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: "Credit Summary" }), isLocked ? _jsx(ReadOnlyView, { content: creditSummary?.content }) : _jsx(RichTextEditor, { content: creditSummary?.content })] }), creditSummary?.pdfUrl ? (_jsx("div", { className: "drawer-footer-actions", children: _jsx("a", { className: "btn btn--ghost", href: creditSummary.pdfUrl, target: "_blank", rel: "noreferrer", children: "Download PDF" }) })) : null] }));
};
export default CreditSummaryTab;
