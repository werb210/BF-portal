import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import ActivityTimeline from "../components/ActivityTimeline";
export default function BIApplicationDetail() {
    const { id } = useParams();
    const [app, setApp] = useState(null);
    const [tab, setTab] = useState("application");
    useEffect(() => {
        void load();
    }, [id]);
    async function load() {
        if (!id) {
            return;
        }
        const data = await api(`/api/bi/applications/${id}`);
        setApp(data);
    }
    async function changeStage(stage) {
        if (!id || !stage) {
            return;
        }
        await api(`/api/bi/applications/${id}/stage`, {
            method: "POST",
            body: JSON.stringify({
                stage,
                actorType: "staff"
            })
        });
        await load();
    }
    if (!id) {
        return _jsx("div", { className: "max-w-7xl mx-auto px-6", children: "Invalid application" });
    }
    if (!app) {
        return _jsx("div", { className: "max-w-7xl mx-auto px-6", children: "Loading..." });
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-6 bg-brand-surface border border-card rounded-xl p-8 shadow-soft", children: [_jsx("h1", { className: "text-2xl font-semibold mb-6", children: "Application Detail" }), _jsxs("div", { className: "flex flex-wrap gap-3 mb-6", children: [_jsx("button", { className: "bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium", type: "button", onClick: () => setTab("application"), children: "Application" }), _jsx("button", { className: "bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium", type: "button", onClick: () => setTab("documents"), children: "Documents" }), _jsx("button", { className: "bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium", type: "button", onClick: () => setTab("timeline"), children: "Timeline" }), _jsx("button", { className: "bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium", type: "button", onClick: () => setTab("commission"), children: "Commission" })] }), tab === "application" && (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Stage: ", app.stage] }), _jsxs("p", { children: ["Bankruptcy Flag: ", app.bankruptcy_flag ? "Yes" : "No"] }), _jsxs("p", { children: ["Premium: $", app.premium_calc?.annualPremium?.toLocaleString() || "-"] }), _jsx("h3", { className: "mt-6 mb-2 text-lg font-semibold", children: "Change Stage" }), _jsxs("select", { className: "bg-brand-bgAlt border border-card rounded-lg px-3 h-10", defaultValue: "", onChange: (e) => void changeStage(e.target.value), children: [_jsx("option", { value: "", children: "Select" }), _jsx("option", { value: "under_review", children: "Under Review" }), _jsx("option", { value: "approved", children: "Approved" }), _jsx("option", { value: "declined", children: "Declined" }), _jsx("option", { value: "policy_issued", children: "Policy Issued" })] })] })), tab === "documents" && _jsx(DocumentList, { applicationId: id }), tab === "timeline" && _jsx(ActivityTimeline, { applicationId: id }), tab === "commission" && _jsx(CommissionTab, { applicationId: id })] }));
}
function DocumentList({ applicationId }) {
    const [docs, setDocs] = useState([]);
    useEffect(() => {
        void load();
    }, [applicationId]);
    async function load() {
        const data = await api(`/api/bi/applications/${applicationId}/documents`);
        setDocs(data);
    }
    return (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Documents" }), docs.map((d) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4 mb-3", children: [_jsx("p", { children: d.original_filename }), _jsx("p", { children: new Date(d.created_at).toLocaleString() })] }, d.id)))] }));
}
function CommissionTab({ applicationId }) {
    const [row, setRow] = useState(null);
    useEffect(() => {
        void load();
    }, [applicationId]);
    async function load() {
        const data = await api(`/api/bi/commissions/by-application/${applicationId}`);
        setRow(data);
    }
    if (!row) {
        return _jsx("div", { children: "No commission record" });
    }
    return (_jsxs("div", { className: "bg-brand-bgAlt border border-card rounded-xl p-4", children: [_jsxs("p", { children: ["Premium: $", row.annual_premium_amount] }), _jsxs("p", { children: ["Commission (10%): $", row.commission_amount] }), _jsxs("p", { children: ["Status: ", row.status] })] }));
}
