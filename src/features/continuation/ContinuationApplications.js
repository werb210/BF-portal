import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const buildLeadId = (app) => `lead-${app.email.toLowerCase()}`;
export default function ContinuationApplications() {
    const [apps, setApps] = useState([]);
    useEffect(() => {
        setApps([]);
    }, []);
    function convertToApplication(id) {
        setApps((previous) => previous.map((app) => app.id === id
            ? {
                ...app,
                status: "application"
            }
            : app));
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "mb-6 text-2xl font-semibold", children: "Capital Readiness / Continuations" }), _jsx("div", { className: "grid gap-4", children: apps.map((app) => (_jsxs("div", { className: "rounded border bg-white p-4 shadow", children: [_jsx("div", { className: "text-lg font-semibold", children: app.companyName }), _jsx("div", { children: app.fullName }), _jsx("div", { children: app.email }), _jsx("div", { children: app.phone }), _jsxs("div", { className: "mt-2 text-sm text-gray-500", children: ["Industry: ", app.industry] }), _jsxs("div", { className: "mt-1 text-sm text-gray-500", children: ["Status: ", app.status] }), _jsxs("div", { className: "text-sm text-gray-500", children: ["Linked CRM lead: ", app.linkedLeadId] }), _jsxs("div", { className: "mt-2 text-xs text-slate-500", children: ["KYC preserved: ", app.yearsInBusiness ?? "n/a", " years \u00B7 Revenue ", app.monthlyRevenue ?? app.annualRevenue ?? "n/a"] }), _jsx("button", { type: "button", onClick: () => convertToApplication(app.id), className: "mt-3 rounded border border-slate-300 px-3 py-1 text-sm", disabled: app.status === "application", children: app.status === "application" ? "Converted" : "Convert to Application" })] }, app.id))) })] }));
}
