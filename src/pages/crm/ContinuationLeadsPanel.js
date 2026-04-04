import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchContinuationLeads } from "@/api/crm";
export default function ContinuationLeadsPanel() {
    const [leads, setLeads] = useState([]);
    useEffect(() => {
        void fetchContinuationLeads().then((data) => setLeads(Array.isArray(data) ? data : []));
    }, []);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Website Continuations" }), leads.map((l) => (_jsxs("div", { className: "rounded border bg-neutral-900 p-4 text-white", children: [_jsx("div", { className: "font-semibold", children: l.companyName }), _jsxs("div", { className: "text-sm opacity-80", children: [l.fullName, " \u00B7 ", l.email, " \u00B7 ", l.phone] }), _jsxs("div", { className: "mt-2 text-xs", children: ["Industry: ", l.industry] })] }, l.id)))] }));
}
