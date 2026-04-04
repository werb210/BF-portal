import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { DetailSection } from "@/pages/applications/ApplicationDetails";
import { getErrorMessage } from "@/utils/errors";
const OverviewTab = () => {
    const { applicationId, data: details, isLoading, error } = useApplicationDetails();
    const overviewData = useMemo(() => {
        if (!details)
            return null;
        if (details.overview)
            return details.overview;
        return {
            applicant: details.applicant,
            status: details.status,
            submittedAt: details.submittedAt,
            stage: details.stage,
            productCategory: details.productCategory
        };
    }, [details]);
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view details." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading application overview\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load application overview.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__overview", children: [_jsx(DetailSection, { title: "Overview", data: overviewData }), _jsx(DetailSection, { title: "Application Payload", data: details?.rawPayload ?? null })] }));
};
export default OverviewTab;
