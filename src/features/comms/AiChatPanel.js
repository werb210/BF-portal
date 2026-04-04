import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { closeChat, fetchActiveChats, sendStaffMessage } from "@/api/ai";
export default function AiChatPanel() {
    const [chats, setChats] = useState([]);
    const [active, setActive] = useState(null);
    const [input, setInput] = useState("");
    useEffect(() => {
        void load();
    }, []);
    async function load() {
        const data = await fetchActiveChats();
        const nextChats = Array.isArray(data) ? data : [];
        setChats(nextChats);
        if (active) {
            const refreshed = nextChats.find((chat) => chat.id === active.id) ?? null;
            setActive(refreshed);
        }
    }
    async function reply() {
        if (!active || !input.trim())
            return;
        await sendStaffMessage(active.id, input);
        setInput("");
        await load();
    }
    async function close() {
        if (!active)
            return;
        await closeChat(active.id);
        setActive(null);
        await load();
    }
    return (_jsxs("div", { className: "p-2", children: [_jsx("h1", { className: "mb-6 text-2xl font-semibold", children: "Live AI Chats" }), _jsxs("div", { className: "grid gap-6 md:grid-cols-3", children: [_jsx("div", { className: "rounded border p-4", children: chats.map((chat) => (_jsx("div", { className: "cursor-pointer border-b p-2", onClick: () => setActive(chat), children: chat.companyName || "New Visitor" }, chat.id))) }), _jsx("div", { className: "flex flex-col rounded border p-4 md:col-span-2", children: active ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4 flex-1 space-y-2 overflow-auto", children: active.messages?.map((message, index) => (_jsxs("div", { className: "text-sm", children: [_jsxs("strong", { children: [message.role, ":"] }), " ", message.content] }, `${message.role}-${index}`))) }), _jsx("input", { value: input, onChange: (event) => setInput(event.target.value), className: "mb-2 border p-2" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => void reply(), className: "rounded bg-blue-600 px-4 py-2 text-white", children: "Send" }), _jsx("button", { onClick: () => void close(), className: "rounded bg-gray-600 px-4 py-2 text-white", children: "Close Chat" })] })] })) : (_jsx("div", { children: "Select a chat" })) })] })] }));
}
