import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { DetailSection } from "@/pages/applications/ApplicationDetails";
import { getErrorMessage } from "@/utils/errors";
const FinancialProfileTab = () => {
    const { applicationId, data: details, isLoading, error } = useApplicationDetails();
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view financial profile." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading financial profile\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load financial profile.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__financial-profile", children: [_jsx(DetailSection, { title: "Financial Profile", data: details?.financialProfile ?? null }), _jsx(DetailSection, { title: "Funding Request", data: details?.fundingRequest ?? null })] }));
};
export default FinancialProfileTab;
