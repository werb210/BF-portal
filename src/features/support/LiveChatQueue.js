import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export function LiveChatQueue({ isAdmin }) {
    const [requests, setRequests] = useState([]);
    async function load() {
        const data = await api("/support/live");
        setRequests(data);
    }
    useEffect(() => {
        if (!isAdmin)
            return;
        void load();
        const interval = setInterval(() => {
            void load();
        }, 5000);
        return () => clearInterval(interval);
    }, [isAdmin]);
    if (!isAdmin)
        return null;
    return (_jsxs("div", { children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Live Chat Requests" }), _jsx("div", { className: "space-y-2", children: requests.map((request) => (_jsxs("div", { className: "chat-request flex items-center justify-between rounded border border-slate-200 p-3", children: [_jsx("strong", { children: request.source }), _jsx("button", { className: "rounded border border-slate-300 px-3 py-1", onClick: () => (() => { throw new Error("Open chat window"); })(), children: "Join Chat" })] }, request.id))) })] }));
}
