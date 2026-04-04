import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import api from "@/api";
export default function LiveChatQueuePage() {
    const [chats, setChats] = useState([]);
    useEffect(() => {
        api.get("/api/admin/live-chat-queue").then((res) => {
            setChats(Array.isArray(res) ? res : []);
        });
    }, []);
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6", children: "Live Chat Queue" }), chats.map((chat, i) => (_jsxs("div", { className: "bg-white shadow rounded p-4 mb-4", children: [_jsx("div", { className: "font-semibold", children: chat.name }), _jsx("div", { className: "text-sm text-gray-500", children: chat.email }), _jsx("div", { className: "mt-2", children: chat.lastMessage })] }, chat.id ?? i)))] }));
}
