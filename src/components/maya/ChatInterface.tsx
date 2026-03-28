import { useMemo, useState } from "react";
import { sendMayaMessage } from "@/services/mayaService";
import MayaMemoryPanel from "@/components/maya/MayaMemoryPanel";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sessionMemory = useMemo(
    () => ({
      fundingAmount: "Unknown",
      revenue: "Unknown",
      timeInBusiness: "Unknown",
      productType: "Unknown",
      industry: "Unknown"
    }),
    []
  );

  const onSend = async () => {
    if (!input.trim()) return;

    const message = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const result = await sendMayaMessage(message);
      const reply = (result as { reply?: string }).reply ?? "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach Maya right now. Please try again." }
      ]);
    }
  };

  return (
    <div className="flex h-[calc(100%-60px)] flex-col p-4">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className="rounded bg-slate-100 p-2 text-sm text-slate-800">
            <strong>{message.role === "user" ? "You" : "Maya"}:</strong> {message.content}
          </div>
        ))}
      </div>
      <MayaMemoryPanel data={sessionMemory} />
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Ask Maya…"
        />
        <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={onSend}>
          Send
        </button>
      </div>
    </div>
  );
}
