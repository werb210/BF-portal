import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function BIReports() {
    const [metrics, setMetrics] = useState(null);
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const data = await api("/api/bi/reports/summary");
        setMetrics(data);
    }
    if (!metrics)
        return _jsx("div", { className: "max-w-7xl mx-auto px-6", children: "Loading..." });
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-6", children: [_jsx("h2", { className: "text-3xl font-semibold mb-8", children: "Boreal Insurance Reports" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4", children: [_jsx(KPI, { title: "Applications (Total)", value: metrics.totalApplications }), _jsx(KPI, { title: "Policies Issued", value: metrics.policiesIssued }), _jsx(KPI, { title: "Conversion Rate", value: `${metrics.conversionRate}%` }), _jsx(KPI, { title: "Premium Volume", value: `$${metrics.premiumVolume.toLocaleString()}` }), _jsx(KPI, { title: "Commission Outstanding", value: `$${metrics.commissionOutstanding.toLocaleString()}` }), _jsx(KPI, { title: "Claims Ratio", value: `${metrics.claimsRatio}%` }), _jsx(KPI, { title: "Referral Volume", value: metrics.referralCount }), _jsx(KPI, { title: "Lender Volume", value: metrics.lenderCount })] }), _jsx("button", { className: "mt-8 bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-5 font-medium", onClick: () => {
                    window.location.href = "/bi/reports/commission";
                }, children: "View Detailed Commission Ledger" })] }));
}
function KPI({ title, value }) {
    return (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-6 shadow-soft text-center", children: [_jsx("h4", { className: "text-sm text-white/70", children: title }), _jsx("p", { className: "text-2xl font-semibold mt-2", children: value })] }));
}
