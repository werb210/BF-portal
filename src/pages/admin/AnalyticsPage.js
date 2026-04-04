import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api";
export default function AnalyticsPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    useEffect(() => {
        const cacheKey = "portal:analytics:events";
        const cachedEvents = sessionStorage.getItem(cacheKey);
        if (cachedEvents) {
            try {
                const parsed = JSON.parse(cachedEvents);
                setEvents(Array.isArray(parsed) ? parsed : []);
                return;
            }
            catch {
                sessionStorage.removeItem(cacheKey);
            }
        }
        api("/analytics")
            .then((data) => {
            const nextEvents = Array.isArray(data) ? data : [];
            setEvents(nextEvents);
            sessionStorage.setItem(cacheKey, JSON.stringify(nextEvents));
        })
            .catch(() => setEvents([]));
    }, []);
    if (user?.role !== "Admin") {
        return _jsx("div", { children: "Access denied" });
    }
    return (_jsxs("div", { className: "page space-y-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: "Website Analytics Events" }), _jsx("ul", { className: "list-disc space-y-1 pl-5", children: events.map((event, i) => (_jsx("li", { children: event.event_name }, `${event.event_name ?? "event"}-${i}`))) })] }));
}
