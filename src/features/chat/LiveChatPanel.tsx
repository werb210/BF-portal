import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  applyHumanActiveState,
  closeEscalatedChat,
  fetchCommunicationThreads,
  sendCommunication,
  type CommunicationConversation
} from "@/api/communications";
import {
  reconnectAiSocket,
  subscribeAiSocket,
  subscribeAiSocketConnection,
  type ConnectionEventName
} from "@/services/aiSocket";

type SessionStatus = "ai" | "human" | "closed";

const toSessionStatus = (conversation: CommunicationConversation): SessionStatus => {
  if (conversation.status === "human" || conversation.status === "closed") return conversation.status;
  return "ai";
};

const buildTransferMessage = (status: SessionStatus) => {
  if (status === "human") return "Human active";
  if (status === "closed") return "Closed";
  return "AI active";
};


const sessionDisplayName = (session: CommunicationConversation) =>
  session.contactName || session.contactEmail || session.applicationName || "Unknown client";

const sessionMetaLabel = (session: CommunicationConversation) => {
  if (session.contactEmail && session.contactPhone) return `${session.contactEmail} · ${session.contactPhone}`;
  if (session.contactEmail) return session.contactEmail;
  if (session.contactPhone) return session.contactPhone;
  return session.sessionId ?? session.id;
};

export default function LiveChatPanel() {
  const [sessions, setSessions] = useState<CommunicationConversation[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionEventName>("connecting");

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const threads = await fetchCommunicationThreads();
      const chatThreads = threads.filter((thread) => thread.type === "chat" || thread.type === "human");
      setSessions(chatThreads);
      setActiveSessionId((current) => current ?? chatThreads[0]?.id ?? null);
    } catch {
      setError("Unable to load chat sessions right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const safeLoadSessions = async () => {
      await loadSessions();
      if (!mounted) return;
    };

    void safeLoadSessions();

    const unsubscribeConnection = subscribeAiSocketConnection((state) => {
      if (!mounted) return;
      setConnectionState(state);
    });

    const refreshSessions = () => {
      if (!mounted) return;
      void loadSessions();
    };

    const unsubscribeNewMessage = subscribeAiSocket("new_chat_message", refreshSessions);
    const unsubscribeSessionTimeout = subscribeAiSocket("session_timeout", refreshSessions);
    const unsubscribeSessionClosed = subscribeAiSocket("session_closed", refreshSessions);

    return () => {
      mounted = false;
      unsubscribeConnection();
      unsubscribeNewMessage();
      unsubscribeSessionTimeout();
      unsubscribeSessionClosed();
    };
  }, [loadSessions]);

  const updateConversation = (updated: CommunicationConversation) => {
    setSessions((current) => current.map((conversation) => (conversation.id === updated.id ? updated : conversation)));
  };

  const onJoinSession = async (conversation: CommunicationConversation) => {
    try {
      const updated = await applyHumanActiveState(conversation.id);
      await sendCommunication(updated.id, "Transferring you…", "system");
      await loadSessions();
      setActiveSessionId(updated.id);
    } catch {
      setError("Unable to transfer session to staff right now.");
    }
  };

  const onCloseSession = async (conversation: CommunicationConversation) => {
    try {
      const transcript = conversation.messages.map((message) => `${message.direction}: ${message.message}`).join("\n");
      const updated = await closeEscalatedChat(conversation.id, transcript);
      updateConversation(updated);
    } catch {
      setError("Unable to close session right now.");
    }
  };

  const onSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeSession || !draftMessage.trim() || toSessionStatus(activeSession) === "closed") return;

    try {
      await sendCommunication(activeSession.id, draftMessage.trim(), "human");
      await loadSessions();
      setDraftMessage("");
    } catch {
      setError("Unable to send message right now.");
    }
  };

  const connectionLabel = connectionState === "connected" ? "Online" : connectionState === "connecting" ? "Reconnecting" : "Offline";

  return (
    <div className="grid gap-4 p-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Live Chat Sessions</h2>
          <button
            type="button"
            onClick={reconnectAiSocket}
            className="rounded border px-2 py-1 text-xs"
          >
            Reconnect
          </button>
        </div>
        <p className="text-xs text-gray-500">Staff presence: {connectionLabel}</p>

        {loading && <p className="text-sm text-gray-500">Loading sessions…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {sessions.map((session) => {
          const status = toSessionStatus(session);
          return (
            <button
              type="button"
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className="block w-full rounded border p-3 text-left"
            >
              <div className="font-medium">{sessionDisplayName(session)}</div>
              <div className="text-xs text-gray-500">{sessionMetaLabel(session)}</div>
              <div className="text-xs text-blue-600">{buildTransferMessage(status)}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded border p-4">
        {!activeSession && <p className="text-sm text-gray-500">Select a session to begin.</p>}

        {activeSession && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{sessionDisplayName(activeSession)}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => void onJoinSession(activeSession)}
                  disabled={toSessionStatus(activeSession) !== "ai"}
                >
                  Join
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => void onCloseSession(activeSession)}
                  disabled={toSessionStatus(activeSession) === "closed"}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mb-3 max-h-[380px] space-y-2 overflow-auto rounded border p-3">
              {activeSession.messages.map((message) => (
                <div key={message.id} className="text-sm">
                  <span className="font-medium">{message.direction === "in" ? "Client" : "Staff"}:</span> {message.message}
                </div>
              ))}
            </div>

            <form className="flex gap-2" onSubmit={onSendMessage}>
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Reply to client"
              />
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={toSessionStatus(activeSession) === "closed"}
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
