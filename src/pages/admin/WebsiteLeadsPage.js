import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function WebsiteLeadsPage() {
    const [leads, setLeads] = useState([]);
    useEffect(() => {
        api.get("/api/admin/website-leads").then((res) => {
            setLeads(Array.isArray(res) ? res : []);
        });
    }, []);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Website Leads" }), _jsx("div", { className: "bg-white rounded shadow overflow-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3 text-left", children: "Company" }), _jsx("th", { className: "p-3 text-left", children: "Name" }), _jsx("th", { className: "p-3 text-left", children: "Email" }), _jsx("th", { className: "p-3 text-left", children: "Phone" }), _jsx("th", { className: "p-3 text-left", children: "Created" })] }) }), _jsx("tbody", { children: leads.map((lead, i) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "p-3", children: lead.company }), _jsxs("td", { className: "p-3", children: [lead.firstName, " ", lead.lastName] }), _jsx("td", { className: "p-3", children: lead.email }), _jsx("td", { className: "p-3", children: lead.phone }), _jsx("td", { className: "p-3", children: lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "—" })] }, lead.id ?? i))) })] }) })] }));
}
