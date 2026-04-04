import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function ActivityTimeline({ applicationId }) {
    const [events, setEvents] = useState([]);
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const data = await api(`/api/bi/applications/${applicationId}/activity`);
        setEvents([...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
    return (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-3", children: "Activity Timeline" }), events.map((e) => (_jsxs("div", { className: "bg-brand-surface border border-card rounded-xl p-4 mb-3", children: [_jsx("strong", { children: e.event_type }), _jsx("p", { children: e.summary }), _jsx("small", { children: new Date(e.created_at).toLocaleString() })] }, e.id)))] }));
}
