import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closeSession,
  fetchActiveAiSessions,
  fetchAiMessages,
  sendSessionStaffMessage,
  takeOverSession
} from "@/api/ai";
import { useAiSocket } from "@/hooks/useAiSocket";
import { useAuth } from "@/hooks/useAuth";
import RequireRole from "@/components/auth/RequireRole";

type AiSession = {
  id: string;
  source?: string;
  status: string;
};

type AiMessage = {
  role: string;
  content: string;
};

function AiSessionsPanel() {
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [selected, setSelected] = useState<AiSession | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [socketError, setSocketError] = useState<string | null>(null);
  const { user } = useAuth();
  const canModerateChat = useMemo(() => ["admin", "staff"].includes(String(user?.role ?? "").toLowerCase()), [user?.role]);

  const loadSessions = useCallback(async () => {
    const data = await fetchActiveAiSessions();
    setSessions(data);
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    const data = await fetchAiMessages(sessionId);
    setSelected(data.session);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useAiSocket(
    selected?.id ?? null,
    (incomingMessage) => {
      setMessages((current) => [...current, incomingMessage as AiMessage]);
      setSocketError(null);
    },
    {
      onStatus: setSocketStatus,
      onError: (message) => setSocketError(message)
    }
  );

  async function handleTakeover() {
    if (!selected) return;
    await takeOverSession(selected.id);
    setMessages((current) => [...current, { role: "system", content: "Transferring you to a staff member…" }]);
    await loadMessages(selected.id);
    await loadSessions();
  }

  async function handleSend() {
    if (!selected || !input.trim()) return;
    await sendSessionStaffMessage(selected.id, input);
    setInput("");
    await loadMessages(selected.id);
  }

  async function handleClose() {
    if (!selected) return;
    await closeSession(selected.id);
    setSelected(null);
    setMessages([]);
    await loadSessions();
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r p-3">
        <h3 className="mb-2 font-semibold">AI Conversations</h3>
        <div className="mb-2 text-xs text-slate-500">Socket: {socketStatus}</div>
        {socketError ? <div className="mb-2 text-xs text-amber-700">{socketError}</div> : null}
        {sessions.map((session) => (
          <div
            key={session.id}
            className="cursor-pointer p-2 hover:bg-gray-100"
            onClick={() => loadMessages(session.id)}
          >
            {session.source ?? "chat"} — {session.status}
          </div>
        ))}
      </div>

      {selected ? (
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "assistant" ? "text-gray-600" : "text-black"}>
                <strong>{message.role}</strong>: {message.content}
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t p-3">
            {selected.status === "ai" && (
              <button disabled={!canModerateChat} onClick={handleTakeover} className="rounded bg-yellow-500 px-3 py-2 text-white disabled:opacity-50">
                Take Over Chat
              </button>
            )}

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="flex-1 border p-2"
              />
              <button disabled={!canModerateChat} onClick={handleSend} className="rounded bg-blue-600 px-4 text-white disabled:opacity-50">
                Send
              </button>
            </div>

            <button disabled={!canModerateChat} onClick={handleClose} className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50">
              Close Chat
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-gray-400">Select a session</div>
      )}
    </div>
  );
}

export default function AiCommsPage() {
  return (
    <RequireRole roles={["Admin", "Staff"]}>
      <AiSessionsPanel />
    </RequireRole>
  );
}
