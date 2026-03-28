import { useEffect, useState } from "react";
import { closeChatSession, fetchChatSession, fetchOpenChats, sendStaffMessage } from "@/api/chat";
import type { ChatSession } from "@/types/chat";

type SessionSummary = Pick<ChatSession, "id" | "leadId">;

export default function ChatPanel() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [active, setActive] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    void loadOpenChats();
  }, []);

  async function loadOpenChats() {
    const res = await fetchOpenChats();
    setSessions(Array.isArray(res.data) ? res.data : []);
  }

  async function openSession(id: string) {
    const res = await fetchChatSession(id);
    setActive(res.data);
  }

  async function send() {
    if (!input.trim() || !active) return;
    await sendStaffMessage(active.id, input.trim());
    const res = await fetchChatSession(active.id);
    setActive(res.data);
    setInput("");
  }

  async function close() {
    if (!active) return;
    await closeChatSession(active.id);
    setActive(null);
    await loadOpenChats();
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="border p-4">
        <h2 className="mb-4 font-semibold">Live Chat Sessions</h2>
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => void openSession(session.id)}
            className="cursor-pointer border-b py-2"
          >
            Lead #{session.leadId}
          </div>
        ))}
      </div>

      <div className="col-span-2 flex flex-col border p-4">
        {active ? (
          <>
            <div className="mb-4 flex-1 space-y-2 overflow-auto">
              {active.messages.map((message, i) => (
                <div key={`${message.timestamp}-${i}`} className="text-sm">
                  <strong>{message.role}:</strong> {message.content}
                </div>
              ))}
            </div>

            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="mb-2 border p-2"
              placeholder="Reply..."
            />

            <div className="flex gap-2">
              <button onClick={() => void send()} className="bg-black px-4 py-2 text-white">
                Send
              </button>
              <button onClick={() => void close()} className="border px-4 py-2">
                Close Session
              </button>
            </div>
          </>
        ) : (
          <div>Select a session</div>
        )}
      </div>
    </div>
  );
}
