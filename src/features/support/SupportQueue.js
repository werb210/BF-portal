import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getSupportQueue } from "@/api/support";
export default function SupportQueue() {
    const [sessions, setSessions] = useState([]);
    useEffect(() => {
        void load();
        const interval = setInterval(() => {
            void load();
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    async function load() {
        const data = await getSupportQueue();
        setSessions(data.sessions || []);
    }
    return (_jsxs("div", { children: [_jsx("h2", { children: "Live Support Requests" }), sessions.map((s) => (_jsxs("div", { style: { padding: 12, borderBottom: "1px solid #eee" }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Source:" }), " ", s.source] }), _jsxs("div", { children: [_jsx("strong", { children: "Time:" }), " ", new Date(s.createdAt).toLocaleString()] }), _jsx("button", { onClick: () => (() => { throw new Error("Chat window to open here"); })(), children: "Join Chat" })] }, s.id)))] }));
}
