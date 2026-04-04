import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function CreditReadinessLeads() {
    const [leads, setLeads] = useState([]);
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const res = await api.get("/api/credit-readiness/leads");
        setLeads(Array.isArray(res) ? res : []);
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "mb-6 text-2xl font-semibold", children: "Capital Readiness Leads" }), _jsx("div", { className: "space-y-4", children: leads.map((lead) => (_jsxs("div", { className: "rounded border p-4", children: [_jsxs("div", { children: [_jsx("strong", { children: "Company:" }), " ", lead.companyName] }), _jsxs("div", { children: [_jsx("strong", { children: "Name:" }), " ", lead.fullName] }), _jsxs("div", { children: [_jsx("strong", { children: "Email:" }), " ", lead.email] }), _jsxs("div", { children: [_jsx("strong", { children: "Phone:" }), " ", lead.phone] }), _jsxs("div", { children: [_jsx("strong", { children: "Industry:" }), " ", lead.industry] }), _jsxs("div", { children: [_jsx("strong", { children: "Revenue:" }), " ", lead.monthlyRevenue] })] }, lead.id))) })] }));
}
