import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getHumanSessions } from "../api";
const ChatQueue = ({ onSelectSession, selectedSessionId, refreshToken = 0 }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        const loadSessions = async () => {
            try {
                const data = await getHumanSessions();
                if (mounted) {
                    setSessions(data);
                }
            }
            finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };
        void loadSessions();
        const interval = window.setInterval(() => {
            void loadSessions();
        }, 10_000);
        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, [refreshToken]);
    if (isLoading) {
        return _jsx("p", { className: "text-sm text-slate-500", children: "Loading live chat queue\u2026" });
    }
    if (!sessions.length) {
        return _jsx("p", { className: "text-sm text-slate-500", children: "No active human sessions." });
    }
    return (_jsx("div", { className: "space-y-3", children: sessions.map((session) => {
            const isSelected = selectedSessionId === session.id;
            return (_jsxs("article", { className: `rounded-lg border p-3 ${isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`, children: [_jsx("p", { className: "font-medium text-slate-900", children: session.lead_name || "Unassigned lead" }), _jsxs("p", { className: "text-xs text-slate-600", children: ["Source: ", session.source] }), _jsxs("p", { className: "text-xs text-slate-500", children: ["Started: ", new Date(session.created_at).toLocaleString()] }), _jsx("button", { type: "button", className: "mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white", onClick: () => onSelectSession(session), children: "Open" })] }, session.id));
        }) }));
};
export default ChatQueue;
