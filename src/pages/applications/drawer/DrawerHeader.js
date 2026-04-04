import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicationDetails } from "@/api/applications";
import { getProcessingStatus } from "@/pages/applications/utils/processingStatus";
const DrawerHeader = ({ applicationId, onBack, canGoBack, onClose }) => {
    const { data } = useQuery({
        queryKey: ["applications", applicationId, "details"],
        queryFn: ({ signal }) => fetchApplicationDetails(applicationId, { signal }),
        enabled: Boolean(applicationId)
    });
    const title = useMemo(() => data?.applicant ?? "Application", [data]);
    const status = data?.status ?? "";
    const processingStatus = useMemo(() => getProcessingStatus({
        ocrCompletedAt: data?.ocr_completed_at,
        bankingCompletedAt: data?.banking_completed_at
    }), [data]);
    return (_jsxs("div", { className: "application-drawer__header", children: [_jsxs("div", { children: [onBack ? (_jsx("button", { className: "ui-button ui-button--ghost", onClick: onBack, disabled: !canGoBack, type: "button", children: "Back" })) : null, _jsx("div", { className: "application-drawer__title", children: title }), status ? _jsxs("div", { className: "application-drawer__subtitle", children: ["Status: ", status] }) : null, processingStatus ? (_jsx("div", { className: "application-drawer__subtitle", children: processingStatus.headerLabel })) : null] }), _jsx("button", { className: "application-drawer__close", onClick: onClose, "aria-label": "Close drawer", type: "button", children: "\u00D7" })] }));
};
export default DrawerHeader;
