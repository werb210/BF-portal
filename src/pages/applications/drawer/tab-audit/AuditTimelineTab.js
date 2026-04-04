import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicationAudit } from "@/api/applications";
import renderValue from "@/pages/applications/ApplicationDetails";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { getErrorMessage } from "@/utils/errors";
import { getAuditEventLabel } from "@/components/Timeline/auditEventLabels";
const AuditTimelineTab = () => {
    const { applicationId, data: details, isLoading, error } = useApplicationDetails();
    const { data: auditEvents = [] } = useQuery({
        queryKey: ["applications", applicationId, "audit"],
        queryFn: ({ signal }) => fetchApplicationAudit(applicationId ?? "", { signal }),
        enabled: Boolean(applicationId)
    });
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view audit history." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading audit timeline\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load audit timeline.") });
    const timeline = details?.auditTimeline?.length ? details.auditTimeline : auditEvents;
    return (_jsx("div", { className: "drawer-tab drawer-tab__audit", children: timeline.length ? (_jsx("div", { className: "drawer-list", children: timeline.map((event) => (_jsx("div", { className: "drawer-list__item", children: _jsxs("div", { className: "drawer-section", children: [_jsx("div", { className: "drawer-section__title", children: getAuditEventLabel(event) }), _jsx("div", { className: "drawer-section__body", children: _jsxs("div", { className: "drawer-kv-list", children: [_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "When" }), _jsx("dd", { children: event.createdAt })] }), event.actor ? (_jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Actor" }), _jsx("dd", { children: event.actor })] })) : null, _jsxs("div", { className: "drawer-kv-list__item", children: [_jsx("dt", { children: "Details" }), _jsx("dd", { children: renderValue(event.detail ?? "No additional details.") })] })] }) })] }) }, event.id))) })) : (_jsx("div", { className: "drawer-placeholder", children: "No audit activity recorded." })) }));
};
export default AuditTimelineTab;
