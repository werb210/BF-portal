import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { closeSession, getMessages, sendStaffMessage } from "../api";
import { attachTranscriptToLead } from "@/api/communications";
import ChatMessage from "./ChatMessage";
import ChatQueue from "./ChatQueue";
const ChatWindow = () => {
    const [selectedSession, setSelectedSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
    const [isClosingSession, setIsClosingSession] = useState(false);
    const [messageError, setMessageError] = useState(null);
    const [refreshToken, setRefreshToken] = useState(0);
    const streamRef = useRef(null);
    useEffect(() => {
        if (!selectedSession)
            return;
        let mounted = true;
        const loadMessages = async () => {
            if (mounted) {
                setIsLoadingMessages(true);
                setMessageError(null);
            }
            try {
                const data = await getMessages(selectedSession.id);
                if (mounted) {
                    setMessages(data);
                }
            }
            catch {
                if (mounted) {
                    setMessageError("We could not load messages. Retrying soon.");
                }
            }
            finally {
                if (mounted) {
                    setIsLoadingMessages(false);
                }
            }
        };
        void loadMessages();
        const interval = window.setInterval(() => {
            void loadMessages();
        }, 5_000);
        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, [selectedSession]);
    useEffect(() => {
        streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);
    const isClosed = selectedSession?.status === "closed";
    const statusBadge = useMemo(() => {
        if (!selectedSession)
            return null;
        if (selectedSession.status === "human") {
            return _jsx("span", { className: "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700", children: "\u25CF Live" });
        }
        return _jsx("span", { className: "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600", children: "Closed" });
    }, [selectedSession]);
    const handleSend = async () => {
        if (!selectedSession || !draft.trim() || isClosed || isSubmittingMessage)
            return;
        try {
            setIsSubmittingMessage(true);
            const sent = await sendStaffMessage(selectedSession.id, draft.trim());
            setMessages((prev) => [...prev, sent]);
            setDraft("");
        }
        finally {
            setIsSubmittingMessage(false);
        }
    };
    const handleCloseSession = async () => {
        if (!selectedSession || isClosed || isClosingSession)
            return;
        try {
            setIsClosingSession(true);
            await closeSession(selectedSession.id);
            const transcript = messages.map((message) => `${message.role}: ${message.message}`).join("\n");
            await attachTranscriptToLead(selectedSession.id, transcript);
            const updatedSession = { ...selectedSession, status: "closed" };
            setSelectedSession(updatedSession);
            setRefreshToken((prev) => prev + 1);
            if (updatedSession.lead_id) {
                window.dispatchEvent(new CustomEvent("crm:lead-refresh", {
                    detail: {
                        leadId: updatedSession.lead_id,
                        events: ["Chat Session Started", "Staff Handoff", "Chat Session Closed", "Transcript Attached"]
                    }
                }));
            }
        }
        finally {
            setIsClosingSession(false);
        }
    };
    return (_jsxs("div", { className: "grid h-[78vh] grid-cols-12 gap-4", children: [_jsxs("aside", { className: "col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-3", children: [_jsx("h2", { className: "mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600", children: "Human chat queue" }), _jsx(ChatQueue, { onSelectSession: setSelectedSession, selectedSessionId: selectedSession?.id, refreshToken: refreshToken })] }), _jsx("section", { className: "col-span-8 flex flex-col rounded-xl border border-slate-200 bg-white", children: selectedSession ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 p-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-semibold text-slate-900", children: ["Session ", selectedSession.id] }), _jsx("p", { className: "text-xs text-slate-500", children: selectedSession.source }), selectedSession.channel === "voice" && (_jsx("p", { className: "mt-1 text-xs font-medium text-violet-600", children: "Voice session coming in V2" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [statusBadge, _jsx("button", { type: "button", onClick: handleCloseSession, disabled: isClosed || isClosingSession, className: "rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50", children: isClosingSession ? "Closing…" : "Close session" })] })] }), _jsxs("div", { ref: streamRef, className: "flex-1 space-y-3 overflow-y-auto p-4", children: [isLoadingMessages && _jsx("p", { className: "text-xs text-slate-500", children: "Loading messages\u2026" }), messageError && _jsx("p", { className: "text-xs text-amber-600", children: messageError }), messages.map((message) => (_jsx("div", { className: `flex ${message.role === "staff" ? "justify-end" : "justify-start"}`, children: _jsx(ChatMessage, { message: message }) }, message.id)))] }), _jsx("footer", { className: "border-t border-slate-200 p-4", children: _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { value: draft, onChange: (event) => setDraft(event.target.value), onKeyDown: (event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                void handleSend();
                                            }
                                        }, disabled: isClosed || isSubmittingMessage, placeholder: isClosed ? "Session closed" : "Type a message", className: "flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" }), _jsx("button", { type: "button", onClick: () => {
                                            void handleSend();
                                        }, disabled: isClosed || !draft.trim() || isSubmittingMessage, className: "rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50", children: isSubmittingMessage ? "Sending…" : "Send" })] }) })] })) : (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-slate-500", children: "Select a session to view live messages." })) })] }));
};
export default ChatWindow;
