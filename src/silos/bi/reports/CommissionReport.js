import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function CommissionReport() {
    const [rows, setRows] = useState([]);
    useEffect(() => {
        load();
    }, []);
    async function load() {
        setRows(await api("/api/bi/commissions"));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-6", children: [_jsx("h3", { className: "text-2xl font-semibold mb-6", children: "Commission Ledger" }), _jsx("div", { className: "space-y-3", children: rows.map((r) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4", children: [_jsxs("p", { children: ["Application: ", r.application_id] }), _jsxs("p", { children: ["Premium: $", r.annual_premium_amount] }), _jsxs("p", { children: ["Commission (10%): $", r.commission_amount] }), _jsxs("p", { children: ["Status: ", r.status] })] }, r.id))) })] }));
}
