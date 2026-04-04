import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { closeAiSession, fetchAiMessages, sendHumanReply } from "@/api/aiChat";
export default function AIChatSessionView({ session }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef(null);
    const load = async () => {
        const data = await fetchAiMessages(session.id);
        setMessages(data);
    };
    useEffect(() => {
        void load();
        const interval = setInterval(() => {
            void load();
        }, 3000);
        return () => clearInterval(interval);
    }, [session.id]);
    useEffect(() => {
        if (!scrollRef.current)
            return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);
    const reply = async () => {
        if (!input.trim())
            return;
        await sendHumanReply(session.id, input.trim());
        setInput("");
        await load();
    };
    const handleCloseSession = async () => {
        await closeAiSession(session.id);
        await load();
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex justify-between border-b p-4", children: [_jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: session.companyName || "Visitor" }), _jsxs("div", { className: "text-xs text-gray-500", children: [session.fullName || "Unknown", " \u2022 ", session.email || "No email"] })] }), _jsx("button", { onClick: handleCloseSession, className: "rounded bg-red-600 px-3 py-1 text-sm text-white", type: "button", children: "Close Session" })] }), _jsx("div", { ref: scrollRef, className: "flex-1 space-y-2 overflow-auto p-4 text-sm", children: messages.map((message) => (_jsx("div", { className: `rounded p-2 ${message.role === "human"
                        ? "bg-green-100"
                        : message.role === "assistant"
                            ? "bg-blue-100"
                            : "bg-gray-100"}`, children: message.content }, message.id))) }), _jsxs("div", { className: "flex gap-2 border-t p-4", children: [_jsx("input", { value: input, onChange: (event) => setInput(event.target.value), className: "flex-1 rounded border p-2", placeholder: "Reply as human..." }), _jsx("button", { onClick: () => void reply(), className: "rounded bg-blue-600 px-4 text-white", type: "button", children: "Send" })] })] }));
}
