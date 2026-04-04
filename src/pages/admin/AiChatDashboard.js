import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import RequireRole from "@/components/auth/RequireRole";
import { subscribeAiSocket } from "@/services/aiSocket";
import { useAiChatQuery, useAiChatsQuery, useCloseChatMutation, useSendStaffMessageMutation } from "@/services/aiService";
import { useAuth } from "@/hooks/useAuth";
const formatTime = (value) => {
    if (!value)
        return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "—";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const AiChatDashboardContent = () => {
    const { user } = useAuth();
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [draft, setDraft] = useState("");
    const [typing, setTyping] = useState(false);
    const audioRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatsQuery = useAiChatsQuery();
    const chats = chatsQuery.data ?? [];
    useEffect(() => {
        if (!selectedChatId && chats.length > 0) {
            const firstChat = chats[0];
            if (!firstChat)
                return;
            setSelectedChatId(firstChat.id);
        }
    }, [chats, selectedChatId]);
    const selectedChatQuery = useAiChatQuery(selectedChatId);
    const selectedChat = selectedChatQuery.data;
    const sendMessageMutation = useSendStaffMessageMutation();
    const closeChatMutation = useCloseChatMutation();
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [selectedChat?.messages]);
    useEffect(() => {
        const unsubscribeEscalated = subscribeAiSocket("session_timeout", () => {
            audioRef.current?.play().catch(() => undefined);
            void chatsQuery.refetch();
            if (selectedChatId) {
                void selectedChatQuery.refetch();
            }
        });
        const unsubscribeNewMessage = subscribeAiSocket("new_chat_message", () => {
            void chatsQuery.refetch();
            if (selectedChatId) {
                void selectedChatQuery.refetch();
            }
        });
        return () => {
            unsubscribeEscalated();
            unsubscribeNewMessage();
        };
    }, [chatsQuery, selectedChatId, selectedChatQuery]);
    const selectedStatusClass = useMemo(() => {
        if (selectedChat?.status === "Escalated") {
            return "border-rose-300 bg-rose-50";
        }
        return "border-slate-200";
    }, [selectedChat?.status]);
    const handleSend = async (event) => {
        event.preventDefault();
        if (!selectedChatId || !draft.trim())
            return;
        await sendMessageMutation.mutateAsync({
            chatId: selectedChatId,
            content: draft.trim(),
            staffName: user?.name ?? user?.email ?? "Staff"
        });
        setDraft("");
        setTyping(false);
    };
    return (_jsxs("div", { className: "page", children: [_jsx("audio", { ref: audioRef, preload: "auto", children: _jsx("source", { src: "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAA=" }) }), _jsx(Card, { title: "AI Live Chat Dashboard", children: _jsxs("div", { className: "grid gap-4 lg:grid-cols-[340px_1fr]", children: [_jsxs("div", { className: "rounded-lg border border-slate-200", children: [_jsx("div", { className: "border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700", children: "Active Sessions" }), _jsx("div", { className: "max-h-[70vh] overflow-auto", children: chats.map((chat) => (_jsxs("button", { type: "button", onClick: () => setSelectedChatId(chat.id), className: `w-full border-b border-slate-100 px-3 py-3 text-left ${selectedChatId === chat.id ? "bg-slate-100" : "bg-white"} ${chat.status === "Escalated" ? "border-l-4 border-l-rose-500" : ""}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-medium text-slate-800", children: chat.customerName ?? chat.id }), _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-semibold ${chat.status === "Escalated"
                                                            ? "bg-rose-100 text-rose-700"
                                                            : "bg-emerald-100 text-emerald-700"}`, children: chat.status })] }), _jsx("p", { className: "truncate text-xs text-slate-600", children: chat.lastMessagePreview ?? "No messages" }), _jsx("p", { className: "mt-1 text-xs text-slate-400", children: formatTime(chat.lastMessageAt) })] }, chat.id))) })] }), _jsxs("div", { className: `rounded-lg border ${selectedStatusClass} flex min-h-[70vh] flex-col`, children: [_jsx("div", { className: "border-b border-slate-200 px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-semibold text-slate-800", children: selectedChat?.customerName ?? "Select a session" }), _jsx("button", { type: "button", disabled: !selectedChatId || closeChatMutation.isPending, onClick: () => selectedChatId && closeChatMutation.mutate(selectedChatId), className: "rounded-md border border-slate-300 px-3 py-1.5 text-xs", children: "Close Chat" })] }) }), _jsxs("div", { className: "flex-1 space-y-3 overflow-auto p-4", children: [(selectedChat?.messages ?? []).map((message) => (_jsxs("div", { className: `max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.role === "staff"
                                                ? "ml-auto bg-slate-900 text-white"
                                                : message.role === "assistant"
                                                    ? "bg-blue-50 text-blue-900"
                                                    : "bg-slate-100 text-slate-800"}`, children: [_jsxs("div", { className: "mb-1 text-[11px] uppercase opacity-80", children: [message.role, message.role === "staff" && message.senderName ? ` • ${message.senderName}` : ""] }), _jsx("div", { children: message.content })] }, message.id))), typing ? _jsx("p", { className: "text-xs text-slate-500", children: "Staff is typing..." }) : null, _jsx("div", { ref: messagesEndRef })] }), _jsx("form", { className: "border-t border-slate-200 p-3", onSubmit: (event) => void handleSend(event), children: _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { value: draft, onChange: (event) => {
                                                    setDraft(event.target.value);
                                                    setTyping(event.target.value.length > 0);
                                                }, placeholder: "Reply as staff...", className: "flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" }), _jsx("button", { type: "submit", disabled: !draft.trim() || sendMessageMutation.isPending, className: "rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50", children: "Send" })] }) })] })] }) })] }));
};
const AiChatDashboard = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(AiChatDashboardContent, {}) }));
export default AiChatDashboard;
