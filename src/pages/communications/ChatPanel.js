import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { closeChatSession, fetchChatSession, fetchOpenChats, sendStaffMessage } from "@/api/chat";
export default function ChatPanel() {
    const [sessions, setSessions] = useState([]);
    const [active, setActive] = useState(null);
    const [input, setInput] = useState("");
    useEffect(() => {
        void loadOpenChats();
    }, []);
    async function loadOpenChats() {
        const res = await fetchOpenChats();
        setSessions(Array.isArray(res) ? res : []);
    }
    async function openSession(id) {
        const res = await fetchChatSession(id);
        if (res && typeof res === "object" && "id" in res) {
            setActive(res);
        }
    }
    async function send() {
        if (!input.trim() || !active)
            return;
        await sendStaffMessage(active.id, input.trim());
        const res = await fetchChatSession(active.id);
        if (res && typeof res === "object" && "id" in res) {
            setActive(res);
        }
        setInput("");
    }
    async function close() {
        if (!active)
            return;
        await closeChatSession(active.id);
        setActive(null);
        await loadOpenChats();
    }
    return (_jsxs("div", { className: "grid grid-cols-3 gap-6", children: [_jsxs("div", { className: "border p-4", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Live Chat Sessions" }), sessions.map((session) => (_jsxs("div", { onClick: () => void openSession(session.id), className: "cursor-pointer border-b py-2", children: ["Lead #", session.leadId] }, session.id)))] }), _jsx("div", { className: "col-span-2 flex flex-col border p-4", children: active ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4 flex-1 space-y-2 overflow-auto", children: active.messages.map((message, i) => (_jsxs("div", { className: "text-sm", children: [_jsxs("strong", { children: [message.role, ":"] }), " ", message.content] }, `${message.timestamp}-${i}`))) }), _jsx("input", { value: input, onChange: (event) => setInput(event.target.value), className: "mb-2 border p-2", placeholder: "Reply..." }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => void send(), className: "bg-black px-4 py-2 text-white", children: "Send" }), _jsx("button", { onClick: () => void close(), className: "border px-4 py-2", children: "Close Session" })] })] })) : (_jsx("div", { children: "Select a session" })) })] }));
}
