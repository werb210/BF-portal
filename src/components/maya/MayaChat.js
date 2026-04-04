import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { sendMayaMessage } from "@/api/maya";
import { getErrorMessage } from "@/utils/errors";
export default function MayaChat() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    async function send() {
        if (!input.trim()) {
            setError("Message cannot be empty.");
            return;
        }
        const userMsg = input.trim();
        setMessages((m) => [...m, { role: "user", text: userMsg }]);
        setInput("");
        setError(null);
        try {
            const mayaResponse = await sendMayaMessage(userMsg);
            const res = (mayaResponse ?? {});
            const reply = res.reply ?? res.data?.reply;
            if (!reply) {
                throw new Error("Invalid Maya response.");
            }
            setMessages((m) => [...m, { role: "maya", text: reply }]);
        }
        catch (e) {
            const message = getErrorMessage(e, "Unable to reach Maya.");
            setError(message);
            setMessages((m) => [...m, { role: "maya", text: message }]);
        }
    }
    return (_jsxs("div", { style: { border: "1px solid #ccc", padding: 12, borderRadius: 8 }, children: [_jsx("div", { style: { height: 200, overflow: "auto", marginBottom: 8 }, children: messages.map((m, i) => (_jsxs("div", { children: [_jsxs("b", { children: [m.role, ":"] }), " ", m.text] }, `${m.role}-${i}`))) }), error ? _jsx("div", { role: "alert", children: error }) : null, _jsx("input", { value: input, onChange: (e) => setInput(e.target.value) }), _jsx("button", { onClick: () => void send(), children: "Send" })] }));
}
