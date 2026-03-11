import { useEffect, useRef, useState } from "react";
import { withApiBase } from "@/lib/apiBase";

type Message = {
  role: "user" | "ai" | "staff";
  content: string;
};

export default function AiLiveChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch(withApiBase(`/api/ai/session/${sessionId}`))
      .then((res) => res.json())
      .then(setMessages)
      .catch(() => setMessages([]));

    const ws = new WebSocket(
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ai/ws`
    );

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join_session", sessionId }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as Message;
      setMessages((prev) => [...prev, msg]);
    };

    wsRef.current = ws;

    return () => ws.close();
  }, [sessionId]);

  function sendMessage() {
    if (!input.trim()) return;

    wsRef.current?.send(
      JSON.stringify({
        type: "staff_message",
        sessionId,
        content: input
      })
    );

    setInput("");
  }

  async function closeSession() {
    await fetch(withApiBase("/api/ai/close"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });

    window.location.href = "/portal/ai";
  }

  return (
    <div className="flex h-[80vh] flex-col p-6">
      <div className="flex-1 space-y-2 overflow-auto border p-4">
        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`} className={m.role === "staff" ? "text-right" : ""}>
            <div className="text-xs opacity-60">{m.role}</div>
            <div>{m.content}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2"
          placeholder="Reply to client..."
        />

        <button onClick={sendMessage} className="rounded bg-blue-600 px-4 text-white">
          Send
        </button>

        <button onClick={closeSession} className="rounded bg-red-600 px-4 text-white">
          Close
        </button>
      </div>
    </div>
  );
}
