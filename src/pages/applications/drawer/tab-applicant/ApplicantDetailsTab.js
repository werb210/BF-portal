import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import { DetailSection } from "@/pages/applications/ApplicationDetails";
import { getErrorMessage } from "@/utils/errors";
const ApplicantDetailsTab = () => {
    const { applicationId, data: details, isLoading, error } = useApplicationDetails();
    if (!applicationId)
        return _jsx("div", { className: "drawer-placeholder", children: "Select an application to view applicant details." });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading applicant details\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load applicant details.") });
    return (_jsxs("div", { className: "drawer-tab drawer-tab__applicant", children: [_jsx(DetailSection, { title: "Applicant Details", data: details?.applicantDetails ?? details?.applicantInfo ?? null }), _jsx(DetailSection, { title: "KYC", data: details?.kyc ?? null })] }));
};
export default ApplicantDetailsTab;
