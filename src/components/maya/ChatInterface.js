import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { sendMayaMessage } from "@/services/mayaService";
import MayaMemoryPanel from "@/components/maya/MayaMemoryPanel";
export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const sessionMemory = useMemo(() => ({
        fundingAmount: "Unknown",
        revenue: "Unknown",
        timeInBusiness: "Unknown",
        productType: "Unknown",
        industry: "Unknown"
    }), []);
    const onSend = async () => {
        if (!input.trim())
            return;
        const message = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: message }]);
        try {
            const result = await sendMayaMessage(message);
            const reply = result.reply ?? "";
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        }
        catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "I couldn't reach Maya right now. Please try again." }
            ]);
        }
    };
    return (_jsxs("div", { className: "flex h-[calc(100%-60px)] flex-col p-4", children: [_jsx("div", { className: "flex-1 space-y-2 overflow-y-auto", children: messages.map((message, index) => (_jsxs("div", { className: "rounded bg-slate-100 p-2 text-sm text-slate-800", children: [_jsxs("strong", { children: [message.role === "user" ? "You" : "Maya", ":"] }), " ", message.content] }, `${message.role}-${index}`))) }), _jsx(MayaMemoryPanel, { data: sessionMemory }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("input", { value: input, onChange: (event) => setInput(event.target.value), className: "w-full rounded border border-slate-300 px-2 py-1 text-sm", placeholder: "Ask Maya\u2026" }), _jsx("button", { className: "rounded bg-slate-900 px-3 py-1 text-sm text-white", onClick: onSend, children: "Send" })] })] }));
}
