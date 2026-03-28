import { useEffect, useState } from "react";
import { closeChat, fetchActiveChats, sendStaffMessage } from "@/api/ai";

type ChatMessage = {
  role: string;
  content: string;
};

type ActiveChat = {
  id: string;
  companyName?: string;
  messages: ChatMessage[];
};

export default function AiChatPanel() {
  const [chats, setChats] = useState<ActiveChat[]>([]);
  const [active, setActive] = useState<ActiveChat | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const data = await fetchActiveChats();
    const nextChats = Array.isArray(data) ? data : [];
    setChats(nextChats);
    if (active) {
      const refreshed = nextChats.find((chat) => chat.id === active.id) ?? null;
      setActive(refreshed);
    }
  }

  async function reply() {
    if (!active || !input.trim()) return;
    await sendStaffMessage(active.id, input);
    setInput("");
    await load();
  }

  async function close() {
    if (!active) return;
    await closeChat(active.id);
    setActive(null);
    await load();
  }

  return (
    <div className="p-2">
      <h1 className="mb-6 text-2xl font-semibold">Live AI Chats</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded border p-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="cursor-pointer border-b p-2"
              onClick={() => setActive(chat)}
            >
              {chat.companyName || "New Visitor"}
            </div>
          ))}
        </div>

        <div className="flex flex-col rounded border p-4 md:col-span-2">
          {active ? (
            <>
              <div className="mb-4 flex-1 space-y-2 overflow-auto">
                {active.messages?.map((message, index) => (
                  <div key={`${message.role}-${index}`} className="text-sm">
                    <strong>{message.role}:</strong> {message.content}
                  </div>
                ))}
              </div>

              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="mb-2 border p-2"
              />

              <div className="flex gap-2">
                <button onClick={() => void reply()} className="rounded bg-blue-600 px-4 py-2 text-white">
                  Send
                </button>

                <button onClick={() => void close()} className="rounded bg-gray-600 px-4 py-2 text-white">
                  Close Chat
                </button>
              </div>
            </>
          ) : (
            <div>Select a chat</div>
          )}
        </div>
      </div>
    </div>
  );
}
