import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function WebLeads() {
    const [leads, setLeads] = useState([]);
    useEffect(() => {
        api("/api/crm/web-leads")
            .then((result) => setLeads(result.leads || []));
    }, []);
    return (_jsxs("div", { children: [_jsx("h2", { children: "Website Leads" }), leads.map((l) => (_jsxs("div", { style: { padding: 12 }, children: [_jsx("div", { children: l.companyName }), _jsxs("div", { children: [l.firstName, " ", l.lastName] }), _jsx("div", { children: l.email }), _jsx("div", { children: l.phone })] }, l.id)))] }));
}
