import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyHumanActiveState, archiveIssue, closeEscalatedChat, deleteIssue, fetchCommunicationThreads, fetchConversationById, fetchCrmLeads, sendCommunication } from "@/api/communications";
import { connectAiSocket, subscribeAiSocket, subscribeAiSocketConnection } from "@/services/aiSocket";
import { getToken } from "@/auth/token";
import { useAuth } from "@/hooks/useAuth";
const conversationLabel = (conversation) => {
    if (conversation.status === "closed")
        return "Closed";
    if (conversation.status === "human" || conversation.metadata?.aiPaused)
        return "Human Mode";
    return "AI Mode";
};
const readinessBadge = (conversation) => {
    const progression = String(conversation.metadata?.progression ?? "").toLowerCase();
    if (progression === "application_submitted")
        return "Application Submitted";
    if (progression === "application_started")
        return "Application Started";
    return "Readiness Only";
};
const readinessStatus = (conversation) => {
    if (conversation.status === "closed")
        return "closed";
    const progression = String(conversation.metadata?.progression ?? "").toLowerCase();
    if (progression === "application_submitted")
        return "converted";
    return "open";
};
const dedupeLeads = (items) => {
    const byKey = new Map();
    items.forEach((lead) => {
        const email = String(lead.email ?? "").trim().toLowerCase();
        const phone = String(lead.phone ?? "").trim().toLowerCase();
        const key = email || phone || lead.id;
        if (!byKey.has(key)) {
            byKey.set(key, lead);
            return;
        }
        const existing = byKey.get(key);
        if (!existing)
            return;
        byKey.set(key, {
            ...existing,
            tags: [...new Set([...(existing.tags ?? []), ...(lead.tags ?? [])])],
            conversationIds: [...new Set([...(existing.conversationIds ?? []), ...(lead.conversationIds ?? [])])],
            transcriptIds: [...new Set([...(existing.transcriptIds ?? []), ...(lead.transcriptIds ?? [])])]
        });
    });
    return [...byKey.values()];
};
const MAX_SESSION_SOCKET_RECONNECT_ATTEMPTS = 6;
const ACTIVE_SESSION_ROW_HEIGHT = 88;
const ACTIVE_SESSION_LIST_HEIGHT = 380;
export default function ChatSessionsPanel() {
    const [sessions, setSessions] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connectionState, setConnectionState] = useState("connecting");
    const [sessionSocketState, setSessionSocketState] = useState("idle");
    const [staffConnected, setStaffConnected] = useState(false);
    const [error, setError] = useState(null);
    const [leads, setLeads] = useState([]);
    const [activeScrollTop, setActiveScrollTop] = useState(0);
    const { user } = useAuth();
    const canModerateChat = ["admin", "staff"].includes(String(user?.role ?? "").toLowerCase());
    const sessionSocketRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const selected = useMemo(() => (selectedId ? sessions.find((session) => session.id === selectedId) ?? null : null), [selectedId, sessions]);
    const selectedLead = useMemo(() => {
        if (!selected?.leadId)
            return null;
        return leads.find((lead) => lead.id === selected.leadId) ?? null;
    }, [leads, selected?.leadId]);
    const issueReports = useMemo(() => sessions.filter((session) => session.type === "issue"), [sessions]);
    const activeEscalations = useMemo(() => sessions.filter((session) => (session.type === "human" || session.type === "chat" || session.type === "credit_readiness") && session.status !== "closed"), [sessions]);
    const closedEscalations = useMemo(() => sessions.filter((session) => (session.type === "human" || session.type === "chat" || session.type === "credit_readiness") && session.status === "closed"), [sessions]);
    const dedupeSessions = (items) => {
        const byId = new Map();
        items.forEach((item) => {
            const key = item.sessionId || item.readinessToken || item.id;
            byId.set(key, item);
        });
        return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    };
    const loadSessions = async () => {
        try {
            const [sessionData, leadData] = await Promise.all([fetchCommunicationThreads(), fetchCrmLeads()]);
            setSessions(dedupeSessions(sessionData));
            setLeads(dedupeLeads(leadData));
            setError(null);
        }
        catch {
            setError("Unable to refresh sessions.");
        }
    };
    const cleanupSessionSocket = () => {
        if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (sessionSocketRef.current) {
            sessionSocketRef.current.close();
            sessionSocketRef.current = null;
        }
        reconnectAttemptRef.current = 0;
        setSessionSocketState("disconnected");
        setStaffConnected(false);
    };
    const connectSessionSocket = (sessionId) => {
        if (!sessionId.trim()) {
            setError("Unable to connect: missing session id.");
            return;
        }
        cleanupSessionSocket();
        setSessionSocketState("connecting");
        const token = getToken();
        const openSocket = () => {
            const url = new URL(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/chat`);
            url.searchParams.set("sessionId", sessionId);
            if (token)
                url.searchParams.set("token", token);
            const ws = new WebSocket(url.toString());
            sessionSocketRef.current = ws;
            ws.addEventListener("open", () => {
                reconnectAttemptRef.current = 0;
                ws.send(JSON.stringify({ type: "staff_joined", sessionId }));
                setSessionSocketState("connected");
                setStaffConnected(true);
            });
            ws.addEventListener("message", (event) => {
                try {
                    const payload = JSON.parse(String(event.data));
                    const text = payload.message ?? payload.body;
                    if (!text)
                        return;
                    setMessages((current) => [
                        ...current,
                        {
                            id: `live-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
                            conversationId: selectedId ?? sessionId,
                            direction: "in",
                            message: text,
                            createdAt: new Date().toISOString(),
                            type: "chat",
                            silo: selected?.silo ?? "BF"
                        }
                    ]);
                }
                catch {
                    // ignore non-json socket payloads
                }
            });
            ws.addEventListener("close", (event) => {
                sessionSocketRef.current = null;
                if (!selectedId) {
                    setSessionSocketState("disconnected");
                    return;
                }
                if (event.wasClean) {
                    setSessionSocketState("disconnected");
                    setStaffConnected(false);
                    setError("Client disconnected. Waiting for reconnection…");
                    return;
                }
                reconnectAttemptRef.current += 1;
                if (reconnectAttemptRef.current > MAX_SESSION_SOCKET_RECONNECT_ATTEMPTS) {
                    setSessionSocketState("disconnected");
                    setError("Live chat disconnected after retry attempts.");
                    return;
                }
                const delay = Math.min(500 * 2 ** reconnectAttemptRef.current, 10_000);
                setSessionSocketState("reconnecting");
                reconnectTimerRef.current = window.setTimeout(() => {
                    reconnectTimerRef.current = null;
                    openSocket();
                }, delay);
            });
            ws.addEventListener("error", () => ws.close());
        };
        openSocket();
    };
    useEffect(() => {
        void loadSessions();
        const disconnect = connectAiSocket();
        const unsubscribeConnection = subscribeAiSocketConnection((state) => setConnectionState(state));
        const unsubscribeEscalated = subscribeAiSocket("session_timeout", () => {
            void loadSessions();
        });
        const unsubscribeIssue = subscribeAiSocket("session_closed", () => {
            void loadSessions();
        });
        const unsubscribeHumanActive = subscribeAiSocket("new_chat_message", (payload) => {
            if (payload && typeof payload === "object" && "sessionId" in payload && typeof payload.sessionId === "string") {
                void applyHumanActiveState(payload.sessionId).then(loadSessions);
            }
            else {
                void loadSessions();
            }
        });
        return () => {
            unsubscribeConnection();
            unsubscribeEscalated();
            unsubscribeIssue();
            unsubscribeHumanActive();
            disconnectAiSocketSafe(disconnect);
            cleanupSessionSocket();
            setConnectionState("disconnected");
        };
    }, []);
    useEffect(() => {
        if (!selectedId) {
            setMessages([]);
            cleanupSessionSocket();
            return;
        }
        void fetchConversationById(selectedId)
            .then((conversation) => {
            setMessages(conversation.messages);
        })
            .catch(() => {
            setError("Unable to load selected session.");
        });
    }, [selectedId, sessions]);
    async function openSession(conversation) {
        try {
            setSelectedId(conversation.id);
            const updated = await fetchConversationById(conversation.id);
            setMessages(updated.messages);
            if (conversation.sessionId) {
                connectSessionSocket(conversation.sessionId);
            }
            if (conversation.status !== "human") {
                await applyHumanActiveState(conversation.id);
                await loadSessions();
            }
        }
        catch {
            setError("Unable to open the selected session.");
        }
    }
    async function transferToStaff(conversation) {
        if (!canModerateChat)
            return;
        try {
            await applyHumanActiveState(conversation.id);
            await sendCommunication(conversation.id, "Transferring you to a staff member…", "system");
            await loadSessions();
        }
        catch {
            setError("Unable to transfer this session.");
        }
    }
    async function send() {
        if (!canModerateChat)
            return;
        if (!selected || !input.trim())
            return;
        try {
            await sendCommunication(selected.id, input, selected.type);
            setInput("");
            await loadSessions();
        }
        catch {
            setError("Unable to send message.");
        }
    }
    async function closeSession() {
        if (!canModerateChat)
            return;
        if (!selected)
            return;
        try {
            const transcript = messages.map((message) => `${message.direction}: ${message.message}`).join("\n");
            await closeEscalatedChat(selected.id, transcript);
            if (sessionSocketRef.current && selected.sessionId) {
                sessionSocketRef.current.send(JSON.stringify({ type: "close_session", sessionId: selected.sessionId, transcript }));
            }
            await loadSessions();
            setSelectedId(null);
            cleanupSessionSocket();
        }
        catch {
            setError("Unable to close the session.");
        }
    }
    async function markIssueResolved(conversationId) {
        if (!canModerateChat)
            return;
        try {
            await closeEscalatedChat(conversationId, "Issue resolved by staff.");
            await loadSessions();
        }
        catch {
            setError("Unable to mark issue resolved.");
        }
    }
    async function archiveIssueReport(conversationId) {
        if (!canModerateChat)
            return;
        try {
            await archiveIssue(conversationId);
            await loadSessions();
        }
        catch {
            setError("Unable to archive issue.");
        }
    }
    async function removeIssue(conversationId) {
        if (!canModerateChat)
            return;
        try {
            await deleteIssue(conversationId);
            await loadSessions();
        }
        catch {
            setError("Unable to delete issue.");
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded border p-4", children: [_jsx("h3", { className: "mb-2 font-semibold", children: "AI Escalations" }), _jsxs("div", { className: "mb-2 text-sm text-slate-600", children: ["Connection: ", connectionState] }), _jsxs("div", { className: "mb-2 text-sm text-slate-600", children: ["Chat socket: ", sessionSocketState === "reconnecting" ? "Reconnecting…" : sessionSocketState] }), _jsxs("div", { className: "mb-2 text-sm text-slate-600", children: ["Active sessions: ", activeEscalations.length] }), error ? _jsx("div", { className: "mb-2 text-sm text-rose-700", children: error }) : null, _jsxs("div", { className: "flex gap-4", children: [_jsxs("div", { className: "w-1/3 border-r pr-2", children: [_jsx("div", { className: "mb-2 text-xs font-semibold uppercase text-slate-500", children: "Active" }), _jsx("div", { className: "overflow-auto", style: { maxHeight: ACTIVE_SESSION_LIST_HEIGHT }, onScroll: (event) => setActiveScrollTop(event.currentTarget.scrollTop), children: activeEscalations.length > 50 ? (_jsx("div", { style: { height: activeEscalations.length * ACTIVE_SESSION_ROW_HEIGHT, position: "relative" }, children: activeEscalations
                                                .slice(Math.max(0, Math.floor(activeScrollTop / ACTIVE_SESSION_ROW_HEIGHT) - 5), Math.ceil((activeScrollTop + ACTIVE_SESSION_LIST_HEIGHT) / ACTIVE_SESSION_ROW_HEIGHT) + 5)
                                                .map((session, index) => {
                                                const start = Math.max(0, Math.floor(activeScrollTop / ACTIVE_SESSION_ROW_HEIGHT) - 5);
                                                const rowIndex = start + index;
                                                return (_jsxs("div", { className: "absolute cursor-pointer p-2 hover:bg-gray-100", style: { left: 0, right: 0, top: rowIndex * ACTIVE_SESSION_ROW_HEIGHT }, onClick: () => void openSession(session), children: [_jsxs("div", { children: ["Session ", session.sessionId ?? session.id] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Lead: ", session.contactName ?? "Unknown"] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Last message: ", new Date(session.updatedAt).toLocaleString()] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Status: ", conversationLabel(session)] })] }, session.id));
                                            }) })) : (activeEscalations.map((session) => (_jsxs("div", { className: "cursor-pointer p-2 hover:bg-gray-100", onClick: () => void openSession(session), children: [_jsxs("div", { children: ["Session ", session.sessionId ?? session.id] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Lead: ", session.contactName ?? "Unknown"] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Last message: ", new Date(session.updatedAt).toLocaleString()] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Status: ", conversationLabel(session)] })] }, session.id)))) }), !activeEscalations.length && _jsx("div", { className: "text-xs text-slate-500", children: "No active sessions." }), _jsx("div", { className: "mb-2 mt-4 text-xs font-semibold uppercase text-slate-500", children: "Closed" }), closedEscalations.map((session) => (_jsxs("div", { className: "p-2", children: [_jsxs("div", { children: ["Session ", session.sessionId ?? session.id] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Lead: ", session.contactName ?? "Unknown"] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Closed at: ", session.updatedAt ? new Date(session.updatedAt).toLocaleString() : "-"] })] }, session.id)))] }), _jsxs("div", { className: "flex flex-1 flex-col gap-3", children: [_jsxs("div", { className: "mb-2 text-xs text-slate-500", children: ["Mode: ", selected ? conversationLabel(selected) : "N/A"] }), staffConnected ? _jsx("div", { className: "text-xs font-semibold text-emerald-700", children: "Staff Connected" }) : null, selected?.type === "credit_readiness" ? (_jsxs("div", { className: "mb-2 inline-block rounded border border-slate-300 px-2 py-1 text-xs text-slate-600", children: [readinessBadge(selected), " \u00B7 ", readinessStatus(selected)] })) : null, selected?.metadata?.continueApplication ? (_jsx("div", { className: "mb-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700", children: "Continuation detected: user resumed application." })) : null, _jsx("div", { className: "flex-1 overflow-auto border p-2 text-sm", children: messages.map((message, index) => (_jsxs("div", { className: "mb-1", children: [_jsxs("strong", { children: [message.direction, ":"] }), " ", message.message] }, `${message.id}-${index}`))) }), selectedLead ? (_jsxs("div", { className: "rounded border p-3 text-xs text-slate-700", children: [_jsx("div", { className: "mb-2 font-semibold", children: "CRM Lead Panel" }), _jsxs("div", { children: ["Company Name: ", selectedLead.id ?? "-"] }), _jsxs("div", { children: ["Full Name: ", selected?.contactName ?? "-"] }), _jsxs("div", { children: ["Email: ", selectedLead.email ?? selected?.contactEmail ?? "-"] }), _jsxs("div", { children: ["Phone: ", selectedLead.phone ?? selected?.contactPhone ?? "-"] }), _jsx("div", { children: "Industry: -" }), _jsx("div", { children: "YIB: -" }), _jsx("div", { children: "Revenue: -" }), _jsx("div", { children: "A/R: -" }), _jsx("div", { children: "Available Collateral: -" }), _jsx("div", { children: "Status: -" }), _jsxs("div", { children: ["Tags: ", (selectedLead.tags ?? []).join(", ") || "-"] }), _jsx("div", { className: "mt-2 font-semibold", children: "Readiness" }), _jsx("div", { children: "Score: -" }), _jsx("div", { children: "Answers: -" }), _jsx("div", { children: "Timestamp: -" }), _jsxs("div", { children: ["Continue Application: ", selected?.metadata?.continueApplication ? "Yes" : "No"] })] })) : null, selected && (_jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx("input", { value: input, onChange: (event) => setInput(event.target.value), className: "flex-1 border p-2", placeholder: "Reply to client..." }), _jsx("button", { onClick: () => void send(), className: "rounded bg-blue-600 px-4 text-white", children: "Send" }), _jsx("button", { disabled: !canModerateChat, onClick: () => void transferToStaff(selected), className: "rounded bg-amber-600 px-4 text-white disabled:opacity-50", children: "Transfer" }), _jsx("button", { disabled: !canModerateChat, onClick: () => void closeSession(), className: "rounded bg-slate-700 px-4 text-white disabled:opacity-50", children: "Close" })] }))] })] })] }), _jsxs("div", { className: "rounded border p-4", children: [_jsx("h3", { className: "mb-2 font-semibold", children: "Issue reports" }), _jsxs("div", { className: "space-y-2 text-sm", children: [issueReports.map((issue) => (_jsxs("div", { className: "rounded border p-2", children: [_jsx("div", { children: issue.messages[0]?.message }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Session: ", issue.sessionId ?? issue.id, " \u00B7 ", String(issue.metadata?.context ?? "website"), " \u00B7", ` ${new Date(issue.updatedAt).toLocaleString()}`] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Lead: ", issue.contactName ?? "Unknown"] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Status: ", issue.status === "closed" ? "Resolved" : "Open"] }), typeof issue.metadata?.screenshot === "string" ? (_jsx("div", { className: "mt-1 space-y-1", children: _jsx("img", { src: issue.metadata.screenshot, alt: "Issue screenshot", className: "max-h-32 border" }) })) : null, _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx("button", { onClick: () => void markIssueResolved(issue.id), className: "rounded bg-emerald-600 px-3 py-1 text-white", children: "Mark resolved" }), _jsx("button", { onClick: () => void archiveIssueReport(issue.id), className: "rounded bg-slate-600 px-3 py-1 text-white", children: "Archive" }), _jsx("button", { disabled: !canModerateChat || issue.status !== "closed", onClick: () => void removeIssue(issue.id), className: "rounded bg-rose-600 px-3 py-1 text-white disabled:opacity-50", children: "Delete" })] })] }, issue.id))), !issueReports.length && _jsx("div", { className: "text-slate-500", children: "No issue reports." })] })] })] }));
}
function disconnectAiSocketSafe(disconnect) {
    if (typeof disconnect === "function") {
        disconnect();
    }
}
