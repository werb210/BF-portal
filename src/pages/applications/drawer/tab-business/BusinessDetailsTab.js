import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { DetailSection } from "@/pages/applications/ApplicationDetails";
import { getErrorMessage } from "@/utils/errors";
const BusinessDetailsTab = () => {
    const { applicationId, data: details, isLoading, error } = useApplicationDetails();
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view business details." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading business details\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load business details.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__business", children: [_jsx(DetailSection, { title: "Business Details", data: details?.businessDetails ?? details?.business ?? null }), _jsx(DetailSection, { title: "Ownership & Operators", data: details?.owners ?? null })] }));
};
export default BusinessDetailsTab;
