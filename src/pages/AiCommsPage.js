// @ts-nocheck
import { useState } from "react";
import { sendMessage } from "../api/ai";
export default function AiCommsPage() {
    const [messages, setMessages] = useState([]);
    const [session, setSession] = useState(null);
    async function handleSend(input) {
        const res = await sendMessage(input, session?.id);
        // FIX: res is NOT Response anymore
        setSession(res.session);
        setMessages(res.messages);
    }
    return null;
}
