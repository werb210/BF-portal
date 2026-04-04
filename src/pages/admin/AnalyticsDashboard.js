import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { AnalyticsService } from "@/services/analyticsService";
import { VisitorActivity } from "@/features/analytics/VisitorActivity";
export default function AnalyticsDashboard() {
    const [events, setEvents] = useState([]);
    const [readiness, setReadiness] = useState({});
    const [view, setView] = useState("overview");
    useEffect(() => {
        async function load() {
            const [eventsRes, readinessRes] = await Promise.all([
                AnalyticsService.getEvents(),
                AnalyticsService.getReadiness()
            ]);
            setEvents(Array.isArray(eventsRes) ? eventsRes : []);
            setReadiness((readinessRes && typeof readinessRes === "object" ? readinessRes : {}));
        }
        void load();
    }, []);
    const lenderNetworkCount = useMemo(() => {
        if (typeof readiness.lenderNetworkCount === "number") {
            return readiness.lenderNetworkCount;
        }
        return events.reduce((acc, event) => {
            const count = Number(event?.metadata?.lenderNetworkCount);
            return Number.isFinite(count) ? Math.max(acc, count) : acc;
        }, 0);
    }, [events, readiness.lenderNetworkCount]);
    return (_jsxs("div", { className: "space-y-4 p-6", children: [_jsx("h1", { className: "mb-4 text-2xl font-bold", children: "Website Analytics" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setView("overview"), children: "Overview" }), _jsx("button", { onClick: () => setView("visitor-tracking"), children: "Visitor Tracking" })] }), view === "visitor-tracking" ? (_jsx(VisitorActivity, {})) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded border p-4", children: [_jsx("p", { className: "text-sm text-gray-500", children: "Readiness Score" }), _jsx("p", { className: "text-3xl font-semibold", children: readiness.score ?? "—" })] }), _jsxs("div", { className: "rounded border p-4", children: [_jsx("p", { className: "text-sm text-gray-500", children: "Lender Network Count" }), _jsx("p", { className: "text-3xl font-semibold", children: lenderNetworkCount })] })] }), _jsxs("table", { className: "w-full border", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100", children: [_jsx("th", { className: "border p-2", children: "Event" }), _jsx("th", { className: "border p-2", children: "Metadata" }), _jsx("th", { className: "border p-2", children: "Date" })] }) }), _jsx("tbody", { children: events.map((event) => (_jsxs("tr", { children: [_jsx("td", { className: "border p-2", children: event.event }), _jsx("td", { className: "border p-2 text-xs", children: JSON.stringify(event.metadata) }), _jsx("td", { className: "border p-2", children: event.created_at })] }, event.id))) })] })] }))] }));
}
