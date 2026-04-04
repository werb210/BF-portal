import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { applyHumanActiveState, closeEscalatedChat, fetchCommunicationThreads, sendCommunication } from "@/api/communications";
import { reconnectAiSocket, subscribeAiSocket, subscribeAiSocketConnection } from "@/services/aiSocket";
const toSessionStatus = (conversation) => {
    if (conversation.status === "human" || conversation.status === "closed")
        return conversation.status;
    return "ai";
};
const buildTransferMessage = (status) => {
    if (status === "human")
        return "Human active";
    if (status === "closed")
        return "Closed";
    return "AI active";
};
const sessionDisplayName = (session) => session.contactName || session.contactEmail || session.applicationName || "Unknown client";
const sessionMetaLabel = (session) => {
    if (session.contactEmail && session.contactPhone)
        return `${session.contactEmail} · ${session.contactPhone}`;
    if (session.contactEmail)
        return session.contactEmail;
    if (session.contactPhone)
        return session.contactPhone;
    return session.sessionId ?? session.id;
};
export default function LiveChatPanel() {
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [draftMessage, setDraftMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [connectionState, setConnectionState] = useState("connecting");
    const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) ?? null, [sessions, activeSessionId]);
    const loadSessions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const threads = await fetchCommunicationThreads();
            const chatThreads = threads.filter((thread) => thread.type === "chat" || thread.type === "human");
            setSessions(chatThreads);
            setActiveSessionId((current) => current ?? chatThreads[0]?.id ?? null);
        }
        catch {
            setError("Unable to load chat sessions right now.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        let mounted = true;
        const safeLoadSessions = async () => {
            await loadSessions();
            if (!mounted)
                return;
        };
        void safeLoadSessions();
        const unsubscribeConnection = subscribeAiSocketConnection((state) => {
            if (!mounted)
                return;
            setConnectionState(state);
        });
        const refreshSessions = () => {
            if (!mounted)
                return;
            void loadSessions();
        };
        const unsubscribeNewMessage = subscribeAiSocket("new_chat_message", refreshSessions);
        const unsubscribeSessionTimeout = subscribeAiSocket("session_timeout", refreshSessions);
        const unsubscribeSessionClosed = subscribeAiSocket("session_closed", refreshSessions);
        return () => {
            mounted = false;
            unsubscribeConnection();
            unsubscribeNewMessage();
            unsubscribeSessionTimeout();
            unsubscribeSessionClosed();
        };
    }, [loadSessions]);
    const updateConversation = (updated) => {
        setSessions((current) => current.map((conversation) => (conversation.id === updated.id ? updated : conversation)));
    };
    const onJoinSession = async (conversation) => {
        try {
            const updated = await applyHumanActiveState(conversation.id);
            await sendCommunication(updated.id, "Transferring you…", "system");
            await loadSessions();
            setActiveSessionId(updated.id);
        }
        catch {
            setError("Unable to transfer session to staff right now.");
        }
    };
    const onCloseSession = async (conversation) => {
        try {
            const transcript = conversation.messages.map((message) => `${message.direction}: ${message.message}`).join("\n");
            const updated = await closeEscalatedChat(conversation.id, transcript);
            updateConversation(updated);
        }
        catch {
            setError("Unable to close session right now.");
        }
    };
    const onSendMessage = async (event) => {
        event.preventDefault();
        if (!activeSession || !draftMessage.trim() || toSessionStatus(activeSession) === "closed")
            return;
        try {
            await sendCommunication(activeSession.id, draftMessage.trim(), "human");
            await loadSessions();
            setDraftMessage("");
        }
        catch {
            setError("Unable to send message right now.");
        }
    };
    const connectionLabel = connectionState === "connected" ? "Online" : connectionState === "connecting" ? "Reconnecting" : "Offline";
    return (_jsxs("div", { className: "grid gap-4 p-6 lg:grid-cols-[320px_1fr]", children: [_jsxs("div", { className: "space-y-3 rounded border p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Live Chat Sessions" }), _jsx("button", { type: "button", onClick: reconnectAiSocket, className: "rounded border px-2 py-1 text-xs", children: "Reconnect" })] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["Staff presence: ", connectionLabel] }), loading && _jsx("p", { className: "text-sm text-gray-500", children: "Loading sessions\u2026" }), error && _jsx("p", { className: "text-sm text-red-600", children: error }), sessions.map((session) => {
                        const status = toSessionStatus(session);
                        return (_jsxs("button", { type: "button", onClick: () => setActiveSessionId(session.id), className: "block w-full rounded border p-3 text-left", children: [_jsx("div", { className: "font-medium", children: sessionDisplayName(session) }), _jsx("div", { className: "text-xs text-gray-500", children: sessionMetaLabel(session) }), _jsx("div", { className: "text-xs text-blue-600", children: buildTransferMessage(status) })] }, session.id));
                    })] }), _jsxs("div", { className: "rounded border p-4", children: [!activeSession && _jsx("p", { className: "text-sm text-gray-500", children: "Select a session to begin." }), activeSession && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h3", { className: "font-semibold", children: sessionDisplayName(activeSession) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", className: "rounded border px-3 py-1 text-sm", onClick: () => void onJoinSession(activeSession), disabled: toSessionStatus(activeSession) !== "ai", children: "Join" }), _jsx("button", { type: "button", className: "rounded border px-3 py-1 text-sm", onClick: () => void onCloseSession(activeSession), disabled: toSessionStatus(activeSession) === "closed", children: "Close" })] })] }), _jsx("div", { className: "mb-3 max-h-[380px] space-y-2 overflow-auto rounded border p-3", children: activeSession.messages.map((message) => (_jsxs("div", { className: "text-sm", children: [_jsxs("span", { className: "font-medium", children: [message.direction === "in" ? "Client" : "Staff", ":"] }), " ", message.message] }, message.id))) }), _jsxs("form", { className: "flex gap-2", onSubmit: onSendMessage, children: [_jsx("input", { value: draftMessage, onChange: (event) => setDraftMessage(event.target.value), className: "w-full rounded border px-3 py-2 text-sm", placeholder: "Reply to client" }), _jsx("button", { type: "submit", className: "rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50", disabled: toSessionStatus(activeSession) === "closed", children: "Send" })] })] }))] })] }));
}
