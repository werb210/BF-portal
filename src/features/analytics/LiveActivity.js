import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function LiveActivity() {
    const [events, setEvents] = useState([]);
    useEffect(() => {
        const interval = setInterval(async () => {
            const result = await api("/api/support/events");
            setEvents(result.events || []);
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    return (_jsxs("div", { children: [_jsx("h2", { children: "Live Website Activity" }), events.map((e, idx) => (_jsxs("div", { children: [e.event, " \u2013 ", e.source] }, idx)))] }));
}
