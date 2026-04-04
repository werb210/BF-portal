import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function ConversionDashboardPage() {
    const [stats, setStats] = useState(null);
    useEffect(() => {
        api.get("/api/admin/conversion-stats").then((res) => {
            setStats(res ?? null);
        });
    }, []);
    if (!stats)
        return null;
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Conversion Overview" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6", children: [_jsx(Stat, { label: "Visitors", value: stats.visitors }), _jsx(Stat, { label: "Leads", value: stats.leads }), _jsx(Stat, { label: "Applications", value: stats.applications }), _jsx(Stat, { label: "Conversion Rate", value: `${stats.rate}%` })] })] }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { className: "bg-white p-4 shadow rounded text-center", children: [_jsx("div", { className: "text-xl font-bold", children: value }), _jsx("div", { className: "text-gray-500 text-sm", children: label })] }));
}
