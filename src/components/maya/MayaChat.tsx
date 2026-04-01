import { useState } from "react";
import { sendMayaMessage } from "@/api/maya";
import { getErrorMessage } from "@/utils/errors";

type MayaMessage = { role: "user" | "maya"; text: string };

type MayaResponse = {
  reply?: string;
  data?: { reply?: string };
};

export default function MayaChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MayaMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setError(null);

    try {
      const res = (await sendMayaMessage(userMsg)) as MayaResponse;
      const reply = res.reply ?? res.data?.reply;
      if (!reply) {
        throw new Error("Empty Maya response");
      }
      setMessages((m) => [...m, { role: "maya", text: reply }]);
    } catch (e) {
      const message = getErrorMessage(e, "Unable to reach Maya.");
      setError(message);
      setMessages((m) => [...m, { role: "maya", text: message }]);
    }
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: 12, borderRadius: 8 }}>
      <div style={{ height: 200, overflow: "auto", marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`}><b>{m.role}:</b> {m.text}</div>
        ))}
      </div>
      {error ? <div role="alert">{error}</div> : null}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => void send()}>Send</button>
    </div>
  );
}
