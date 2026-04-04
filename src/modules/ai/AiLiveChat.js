import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
const API_PREFIX = "/api";
export default function AiLiveChat({ sessionId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const wsRef = useRef(null);
    useEffect(() => {
        api(`${API_PREFIX}/ai/session/${sessionId}`)
            .then(setMessages)
            .catch(() => setMessages([]));
        const ws = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${API_PREFIX}/ai/ws`);
        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "join_session", sessionId }));
        };
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            setMessages((prev) => [...prev, msg]);
        };
        wsRef.current = ws;
        return () => ws.close();
    }, [sessionId]);
    function sendMessage() {
        if (!input.trim())
            return;
        wsRef.current?.send(JSON.stringify({
            type: "staff_message",
            sessionId,
            content: input
        }));
        setInput("");
    }
    async function closeSession() {
        await api("/api/ai/close", {
            method: "POST",
            body: { sessionId }
        });
        window.location.href = "/portal/ai";
    }
    return (_jsxs("div", { className: "flex h-[80vh] flex-col p-6", children: [_jsx("div", { className: "flex-1 space-y-2 overflow-auto border p-4", children: messages.map((m, i) => (_jsxs("div", { className: m.role === "staff" ? "text-right" : "", children: [_jsx("div", { className: "text-xs opacity-60", children: m.role }), _jsx("div", { children: m.content })] }, `${m.role}-${i}`))) }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("input", { value: input, onChange: (e) => setInput(e.target.value), className: "flex-1 border p-2", placeholder: "Reply to client..." }), _jsx("button", { onClick: sendMessage, className: "rounded bg-blue-600 px-4 text-white", children: "Send" }), _jsx("button", { onClick: closeSession, className: "rounded bg-red-600 px-4 text-white", children: "Close" })] })] }));
}
