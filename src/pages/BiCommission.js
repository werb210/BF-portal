import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { api } from "@/api";
import { useEffect, useState } from "react";
export default function BiCommission() {
    const [ledger, setLedger] = useState([]);
    useEffect(() => {
        api
            .get("/api/ledger")
            .then((result) => setLedger(Array.isArray(result) ? result : []));
    }, []);
    const totalCommission = ledger.reduce((sum, l) => sum + Number(l.commission || 0), 0);
    const upcomingRenewals = ledger.filter((l) => {
        const renewal = new Date(l.renewal_date);
        const now = new Date();
        const diff = (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 90;
    });
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "BI Commission Dashboard" }), _jsxs("div", { className: "summary-box", children: [_jsxs("div", { children: [_jsx("strong", { children: "Total Commission (All Years):" }), "$", totalCommission.toLocaleString()] }), _jsxs("div", { children: [_jsx("strong", { children: "Upcoming Renewals (90 Days):" }), upcomingRenewals.length] })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Application ID" }), _jsx("th", { children: "Policy Year" }), _jsx("th", { children: "Premium" }), _jsx("th", { children: "Commission" }), _jsx("th", { children: "Renewal Date" }), _jsx("th", { children: "Paid" })] }) }), _jsx("tbody", { children: ledger.map((l) => (_jsxs("tr", { children: [_jsx("td", { children: l.application_id }), _jsx("td", { children: l.policy_year }), _jsxs("td", { children: ["$", Number(l.annual_premium).toLocaleString()] }), _jsxs("td", { children: ["$", Number(l.commission).toLocaleString()] }), _jsx("td", { children: new Date(l.renewal_date).toLocaleDateString() }), _jsx("td", { children: l.paid ? "Yes" : "No" })] }, l.id))) })] })] }));
}
