import { useEffect, useRef, useState } from "react";
import {
  AiMessage,
  AiSession,
  closeAiSession,
  fetchAiMessages,
  sendHumanReply
} from "@/api/aiChat";

type Props = {
  session: AiSession;
};

export default function AIChatSessionView({ session }: Props) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const reply = async () => {
    if (!input.trim()) return;
    await sendHumanReply(session.id, input.trim());
    setInput("");
    await load();
  };

  const handleCloseSession = async () => {
    await closeAiSession(session.id);
    await load();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-between border-b p-4">
        <div>
          <div className="font-semibold">{session.companyName || "Visitor"}</div>
          <div className="text-xs text-gray-500">
            {session.fullName || "Unknown"} • {session.email || "No email"}
          </div>
        </div>

        <button onClick={handleCloseSession} className="rounded bg-red-600 px-3 py-1 text-sm text-white" type="button">
          Close Session
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-auto p-4 text-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded p-2 ${
              message.role === "human"
                ? "bg-green-100"
                : message.role === "assistant"
                  ? "bg-blue-100"
                  : "bg-gray-100"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t p-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 rounded border p-2"
          placeholder="Reply as human..."
        />
        <button onClick={() => void reply()} className="rounded bg-blue-600 px-4 text-white" type="button">
          Send
        </button>
      </div>
    </div>
  );
}
