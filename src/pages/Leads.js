import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchLeads } from "@/lib/leads";
export default function Leads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            const data = await fetchLeads();
            setLeads(data);
            setLoading(false);
        };
        void load();
    }, []);
    if (loading)
        return _jsx("div", { className: "p-8", children: "Loading..." });
    return (_jsxs("div", { className: "p-8", children: [_jsx("h1", { className: "mb-6 text-3xl font-bold", children: "Incoming Leads" }), _jsx("div", { className: "overflow-auto", children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100 text-left", children: [_jsx("th", { className: "p-3", children: "Company" }), _jsx("th", { className: "p-3", children: "Contact" }), _jsx("th", { className: "p-3", children: "Email" }), _jsx("th", { className: "p-3", children: "Phone" }), _jsx("th", { className: "p-3", children: "Industry" }), _jsx("th", { className: "p-3", children: "Years" }), _jsx("th", { className: "p-3", children: "Annual Revenue" }), _jsx("th", { className: "p-3", children: "Monthly Revenue" }), _jsx("th", { className: "p-3", children: "A/R" }), _jsx("th", { className: "p-3", children: "Collateral" }), _jsx("th", { className: "p-3", children: "Status" }), _jsx("th", { className: "p-3", children: "Source" })] }) }), _jsx("tbody", { children: leads.map((lead) => (_jsxs("tr", { className: "border-b", children: [_jsx("td", { className: "p-3", children: lead.companyName }), _jsx("td", { className: "p-3", children: lead.contactName }), _jsx("td", { className: "p-3", children: lead.email }), _jsx("td", { className: "p-3", children: lead.phone }), _jsx("td", { className: "p-3", children: lead.industry || "-" }), _jsx("td", { className: "p-3", children: lead.yearsInBusiness || "-" }), _jsx("td", { className: "p-3", children: lead.annualRevenue || "-" }), _jsx("td", { className: "p-3", children: lead.monthlyRevenue || "-" }), _jsx("td", { className: "p-3", children: lead.arBalance || "-" }), _jsx("td", { className: "p-3", children: lead.collateral || "-" }), _jsx("td", { className: "p-3", children: lead.status || "-" }), _jsx("td", { className: "p-3", children: lead.source })] }, lead.id))) })] }) })] }));
}
