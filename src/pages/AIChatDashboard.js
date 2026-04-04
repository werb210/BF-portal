import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchAiSessions } from "@/api/aiChat";
import AIChatSessionView from "@/components/AIChatSessionView";
export default function AIChatDashboard() {
    const [sessions, setSessions] = useState([]);
    const [selected, setSelected] = useState(null);
    const load = async () => {
        const data = await fetchAiSessions();
        setSessions(data);
    };
    useEffect(() => {
        void load();
        const interval = setInterval(() => {
            void load();
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    return (_jsxs("div", { className: "flex h-full", children: [_jsxs("div", { className: "w-1/3 overflow-auto border-r", children: [_jsx("div", { className: "border-b p-4 text-lg font-semibold", children: "Active AI Sessions" }), sessions.map((session) => (_jsxs("div", { onClick: () => setSelected(session), className: `cursor-pointer border-b p-4 hover:bg-gray-50 ${selected?.id === session.id ? "bg-gray-100" : ""}`, children: [_jsx("div", { className: "font-medium", children: session.companyName || "Unknown Company" }), _jsxs("div", { className: "text-xs text-gray-500", children: [session.fullName || "Visitor", " \u2022 ", session.status] })] }, session.id)))] }), _jsx("div", { className: "flex-1", children: selected ? (_jsx(AIChatSessionView, { session: selected })) : (_jsx("div", { className: "flex h-full items-center justify-center text-gray-400", children: "Select a session" })) })] }));
}
