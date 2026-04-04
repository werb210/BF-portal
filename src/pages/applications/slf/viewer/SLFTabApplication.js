import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
const API_PREFIX = "";
const SLFTabApplication = ({ applicationId }) => {
    const { data: application = {}, isLoading } = useQuery({
        queryKey: ["slf", "application", applicationId],
        queryFn: ({ signal }) => api.get(`${API_PREFIX}/slf/applications/${applicationId}`, { signal })
    });
    if (isLoading) {
        return _jsx("div", { children: "Loading application data..." });
    }
    return (_jsxs("div", { className: "slf-application-view", children: [_jsx("h3", { children: "Business Info" }), _jsx("pre", { children: JSON.stringify(application.businessInfo ?? {}, null, 2) }), _jsx("h3", { children: "Applicant Info" }), _jsx("pre", { children: JSON.stringify(application.applicantInfo ?? {}, null, 2) }), _jsx("h3", { children: "Funding Request" }), _jsx("pre", { children: JSON.stringify(application.fundingRequest ?? {}, null, 2) }), _jsx("h3", { children: "Financial Snapshot" }), _jsx("pre", { children: JSON.stringify(application.financialSnapshot ?? {}, null, 2) }), _jsx("h3", { children: "Contact" }), _jsx("pre", { children: JSON.stringify(application.contact ?? {}, null, 2) })] }));
};
export default SLFTabApplication;
