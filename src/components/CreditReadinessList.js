import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { convertReadinessToApplication, fetchCreditReadinessLeads } from "@/api/crm";
const tierOptions = [
    "Institutional Profile",
    "Strong Non-Bank Profile",
    "Structured Opportunity",
    "Early Stage"
];
export default function CreditReadinessList() {
    const [leads, setLeads] = useState([]);
    const [filter, setFilter] = useState("");
    const [convertingId, setConvertingId] = useState(null);
    useEffect(() => {
        fetchCreditReadinessLeads().then(setLeads).catch(() => setLeads([]));
    }, []);
    async function convertToApplication(id) {
        setConvertingId(id);
        try {
            await convertReadinessToApplication(id);
            throw new Error("Converted to application");
            setLeads((previous) => previous.filter((lead) => lead.id !== id));
        }
        finally {
            setConvertingId(null);
        }
    }
    const filteredLeads = useMemo(() => leads.filter((lead) => lead.type === "credit_readiness" && (!filter || lead.tier === filter)), [filter, leads]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mr-2 text-sm font-medium", htmlFor: "credit-readiness-tier-filter", children: "Tier" }), _jsxs("select", { className: "rounded border border-slate-300 px-3 py-2", id: "credit-readiness-tier-filter", onChange: (event) => setFilter(event.target.value), value: filter, children: [_jsx("option", { value: "", children: "All" }), tierOptions.map((tier) => (_jsx("option", { value: tier, children: tier }, tier)))] })] }), filteredLeads.map((lead) => (_jsxs("div", { className: "rounded-lg border border-slate-700 bg-slate-900 p-6 text-white", children: [_jsxs("div", { className: "flex justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: lead.companyName }), _jsxs("p", { className: "text-sm text-slate-400", children: [lead.contactName, " \u2022 ", lead.email] }), _jsx("p", { className: "mt-1 inline-block rounded bg-indigo-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide", children: "Credit Readiness" })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-sm text-slate-400", children: ["Score: ", lead.score ?? "-"] }), _jsx("div", { className: "font-medium", children: lead.tier || "Unassigned" })] })] }), _jsxs("div", { className: "mt-4 grid grid-cols-1 gap-4 text-sm text-slate-300 md:grid-cols-2", children: [_jsxs("div", { children: ["Industry: ", lead.industry || "-"] }), _jsxs("div", { children: ["Years: ", lead.yearsInBusiness || "-"] }), _jsxs("div", { children: ["Annual: ", lead.annualRevenue || "-"] }), _jsxs("div", { children: ["Monthly: ", lead.monthlyRevenue || "-"] }), _jsxs("div", { children: ["AR: ", lead.arBalance || "-"] }), _jsxs("div", { children: ["Collateral: ", lead.availableCollateral || "-"] }), _jsxs("div", { children: ["Phone: ", lead.phone || "-"] }), _jsxs("div", { children: ["Created: ", lead.createdAt] })] }), _jsx("div", { className: "mt-6", children: _jsx("button", { className: "rounded bg-white px-4 py-2 text-black disabled:cursor-not-allowed disabled:opacity-70", disabled: convertingId === lead.id, onClick: () => convertToApplication(lead.id), type: "button", children: convertingId === lead.id ? "Converting..." : "Convert to Application" }) })] }, lead.id))), filteredLeads.length === 0 ? _jsx("p", { className: "text-sm text-slate-500", children: "No readiness leads found." }) : null] }));
}
