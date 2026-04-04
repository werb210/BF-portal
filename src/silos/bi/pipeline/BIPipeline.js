import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
const stages = [
    "new_application",
    "documents_pending",
    "under_review",
    "approved",
    "declined",
    "policy_issued"
];
export default function BIPipeline() {
    const [apps, setApps] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const data = await api("/api/bi/applications");
        setApps(data);
    }
    return (_jsx("div", { className: "max-w-7xl mx-auto px-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6", children: stages.map((stage) => (_jsxs("div", { className: "bg-brand-bgAlt border border-card rounded-xl p-4", children: [_jsx("h3", { className: "text-xs text-white/70 mb-3", children: stage.replace("_", " ").toUpperCase() }), apps
                    .filter((a) => a.stage === stage)
                    .map((app) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-3 mb-3", onClick: () => navigate(`/bi/pipeline/${app.id}`), style: { cursor: "pointer" }, children: [_jsx("p", { children: _jsx("strong", { children: app.primary_contact_name || "Applicant" }) }), _jsxs("p", { children: ["$", app.premium_calc?.annualPremium || "-"] }), app.bankruptcy_flag && (_jsx("span", { className: "text-xs text-brand-accent", children: "\u26A0 Bankruptcy" }))] }, app.id)))] }, stage))) }));
}
