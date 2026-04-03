// @ts-nocheck
import { useState } from "react";
import { sendMessage, AiMessage, AiSession } from "../api/ai";

export default function AiCommsPage() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [session, setSession] = useState<AiSession | null>(null);

  async function handleSend(input: string) {
    const res = await sendMessage(input, session?.id);

    // FIX: res is NOT Response anymore
    setSession(res.session);
    setMessages(res.messages);
  }

  return null;
}
