/**
 * Maya in-portal chat widget.
 * Sends messages to /api/maya/message and renders replies inline.
 */
import { useEffect, useRef, useState } from "react";
import { api } from "@/api";

type Message = { role: "user" | "maya"; text: string; ts: number };

export default function MayaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setLoading(true);
    try {
      const res = await api.post<{ reply?: string; message?: string; response?: string }>(
        "/api/maya/message",
        { message: text, source: "portal" }
      );
      const reply =
        typeof res?.reply === "string" ? res.reply :
        typeof res?.message === "string" ? res.message :
        typeof res?.response === "string" ? res.response :
        "I'm here to help — what would you like to know?";
      setMessages((prev) => [...prev, { role: "maya", text: reply, ts: Date.now() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "maya", text: "I'm having trouble connecting right now. Please try again.", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Message list */}
      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, padding: "4px 2px" }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--ui-text-muted)", textAlign: "center", padding: "8px 0" }}>
            Ask Maya anything…
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.ts}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "rgba(255,255,255,0.08)",
              color: "#fff",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "6px 10px",
              fontSize: 12,
              maxWidth: "85%",
              lineHeight: 1.4,
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.08)", color: "var(--ui-text-muted)", borderRadius: "12px 12px 12px 2px", padding: "6px 10px", fontSize: 12 }}>
            …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ask Maya…"
          disabled={loading}
          style={{
            flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 12,
            outline: "none",
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          style={{
            background: "#2563eb", border: "none", borderRadius: 8,
            padding: "6px 10px", color: "#fff", cursor: "pointer", fontSize: 13,
            opacity: !input.trim() || loading ? 0.5 : 1,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
