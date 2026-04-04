import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "@/api";
export default function AiQueueView() {
    const [sessions, setSessions] = useState([]);
    useEffect(() => {
        api("/api/chat/sessions")
            .then(setSessions)
            .catch(() => setSessions([]));
    }, []);
    async function takeSession(id) {
        await api("/api/ai/take", {
            method: "POST",
            body: { sessionId: id }
        });
        window.location.href = `/portal/ai/${id}`;
    }
    return (_jsxs("div", { className: "p-6", children: [_jsx("h2", { className: "mb-4 text-xl font-semibold", children: "AI Live Chat Queue" }), _jsx("div", { className: "space-y-3", children: sessions.map((s) => (_jsxs("div", { className: "flex justify-between rounded border p-4", children: [_jsxs("div", { children: [_jsxs("div", { children: ["Session: ", s.id] }), _jsxs("div", { children: ["Status: ", s.status] })] }), s.status === "queued" && (_jsx("button", { onClick: () => takeSession(s.id), className: "rounded bg-blue-600 px-4 py-2 text-white", children: "Take Over" }))] }, s.id))) })] }));
}
