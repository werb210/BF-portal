import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { api } from "@/api";
import { useCallback, useEffect, useMemo, useState } from "react";
export default function BiApplications() {
    const [apps, setApps] = useState([]);
    const [selected, setSelected] = useState(null);
    const loadApps = useCallback(async () => {
        const result = await api.get("/api/applications");
        const nextApps = Array.isArray(result) ? result : [];
        setApps(nextApps);
        return nextApps;
    }, []);
    useEffect(() => {
        void loadApps();
    }, [loadApps]);
    const totalPremium = useMemo(() => apps.reduce((sum, a) => sum + Number(a.annual_premium || 0), 0), [apps]);
    const totalCommission = useMemo(() => apps.reduce((sum, a) => sum + Number(a.commission || 0), 0), [apps]);
    const updateStatus = async (id, status) => {
        const response = await api.patch(`/api/applications/${id}`, { status });
        if (!response)
            throw new Error("Update failed");
        const nextApps = await loadApps();
        setSelected(nextApps.find((app) => app.id === id) ?? null);
    };
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "BI Applications" }), _jsxs("div", { className: "summary-box", children: [_jsxs("div", { children: [_jsx("strong", { children: "Total Annual Premium:" }), "$", totalPremium.toLocaleString()] }), _jsxs("div", { children: [_jsx("strong", { children: "Total Commission (10%):" }), "$", totalCommission.toLocaleString()] })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Premium" }), _jsx("th", { children: "Commission" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: apps.map((a) => (_jsxs("tr", { onClick: () => setSelected(a), children: [_jsxs("td", { children: [a.first_name, " ", a.last_name] }), _jsx("td", { children: a.email }), _jsxs("td", { children: ["$", Number(a.annual_premium).toLocaleString()] }), _jsxs("td", { children: ["$", Number(a.commission).toLocaleString()] }), _jsx("td", { children: a.status })] }, a.id))) })] }), selected && (_jsxs("div", { className: "detail-panel", children: [_jsx("h2", { children: "Application Detail" }), _jsx("pre", { children: JSON.stringify(selected, null, 2) }), _jsxs("div", { className: "btn-row", children: [_jsx("button", { onClick: () => void updateStatus(selected.id, "approved"), children: "Approve" }), _jsx("button", { onClick: () => void updateStatus(selected.id, "declined"), children: "Decline" }), _jsx("button", { onClick: () => void updateStatus(selected.id, "underwriting_review"), children: "Underwriting Review" })] })] }))] }));
}
