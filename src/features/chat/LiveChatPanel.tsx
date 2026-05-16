import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
// BF_PORTAL_BLOCK_BI_ROUND6_THREADS_DETAIL_v1 -- HTTP-side
// imports trimmed. Legacy HTTP-only helpers were dead after
// Blocks 19 + 21 moved the
// staff side onto the WebSocket. fetchCommunicationThread (new
// in this block) loads per-session message history.
import {
  fetchCommunicationThread,
  fetchCommunicationThreads,
  type CommunicationConversation
} from "@/api/communications";
// BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_WIRING_v1 -- the panel
// now also uses joinChatSessionAsStaff (called when the active
// thread changes) and sendStaffMessage (used by Block 21 for the
// composer) in place of HTTP endpoints that do not exist on
// BF-Server.
import {
  joinChatSessionAsStaff,
  reconnectAiSocket,
  sendStaffMessage,
  subscribeAiSocket,
  subscribeAiSocketConnection,
  type ConnectionEventName
} from "@/services/aiSocket";
// BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_CLOSE_v2 -- supplemental
// import drops sendStaffMessage (already imported via the main
// aiSocket import line added by Block 19) and keeps only
// closeChatSession. Earlier v1 of this line caused TS2300
// duplicate-identifier in CI.
import { closeChatSession } from "@/services/aiSocket";
import { useAuth } from "@/hooks/useAuth";

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
  // BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_WIRING_v1 -- userId for
  // the staff_join frame; falls back through email -> "staff" so a
  // missing id doesn't block the join (the server only requires
  // a non-empty userId string).
  const { user } = useAuth();
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

  // BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_WIRING_v1
  // Send the staff_join WS frame whenever the active thread
  // changes. Server (socket.server.ts:235-265) flips session
  // status to HUMAN_ACTIVE and broadcasts staff_joined to the
  // client widget -- that is the trigger the client widget
  // listens for to render "Transferring you...". Re-fires if the
  // active session changes, which is what a staff member doing
  // round-robin across sessions actually wants. activeSession is
  // a CommunicationConversation; the WS session id sits on
  // sessionId (canonical) with a fallback to id for older threads
  // that did not carry an explicit sessionId.
  useEffect(() => {
    if (!activeSession) return;
    const wsSessionId = activeSession.sessionId ?? activeSession.id;
    if (!wsSessionId) return;
    const staffUserId = user?.id ?? user?.email ?? "staff";
    joinChatSessionAsStaff(wsSessionId, staffUserId);
  }, [activeSession?.id, activeSession?.sessionId, user?.id, user?.email]);

  // BF_PORTAL_BLOCK_BI_ROUND6_THREADS_DETAIL_v1
  // Load message history when activeSessionId changes. Replaces
  // the matching session's messages array in state so the message
  // pane renders the full history instead of the empty messages: []
  // that the list endpoint returns. After this lands, the WS
  // appendIncomingMessage handler keeps the array fresh for the
  // duration of the session.
  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await fetchCommunicationThread(activeSessionId);
        if (cancelled) return;
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? { ...session, ...detail, messages: detail.messages ?? [] }
              : session
          )
        );
      } catch {
        // Non-fatal; the message area stays empty for this session
        // but the panel remains usable for sending new messages.
      }
    })();
    return () => { cancelled = true; };
  }, [activeSessionId]);

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

    // BF_PORTAL_BLOCK_BI_ROUND6_THREADS_DETAIL_v1 -- new_chat_message
    // payload shape (from BF-portal src/services/aiSocket.ts):
    //   {type, sessionId, role, content, id?, created_at?}
    // Append to the matching session's messages array in place
    // rather than calling refreshSessions, which would hit the
    // list endpoint (messages: []) and clobber the history we
    // just loaded via fetchCommunicationThread.
    const appendIncomingMessage = (payload: unknown) => {
      if (!mounted) return;
      const p = payload as {
        sessionId?: string;
        role?: string;
        type?: string;
        content?: string;
        id?: string;
        created_at?: string;
      };
      if (!p?.sessionId || !p?.content) return;
      const role = String(p.role ?? p.type ?? "").toLowerCase();
      const direction =
        role === "user" || role === "user_message" ? "in" :
        (role === "staff" || role === "ai" ||
         role === "staff_message" || role === "ai_message") ? "out" :
        "system";
      const newMessage: CommunicationConversation["messages"][number] = {
        id: p.id ?? `${p.sessionId}:${Date.now()}`,
        conversationId: p.sessionId,
        type: "chat",
        direction: direction as "in" | "out" | "system",
        message: p.content,
        createdAt: p.created_at ?? new Date().toISOString(),
      };
      setSessions((prev) =>
        prev.map((session) => {
          const wsId = session.sessionId ?? session.id;
          if (wsId !== p.sessionId) return session;
          return {
            ...session,
            messages: [...session.messages, newMessage],
            message: newMessage.message,
            updatedAt: newMessage.createdAt,
          };
        })
      );
    };

    const unsubscribeNewMessage = subscribeAiSocket("new_chat_message", appendIncomingMessage);
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

  const onJoinSession = (conversation: CommunicationConversation) => {
    setActiveSessionId(conversation.id);
  };

  // BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_CLOSE_v1 -- close goes
  // through the WS now. The server attaches the transcript on its
  // side (attachTranscriptToCrm) and then broadcasts close_session,
  // which the panel listens for via the existing
  // subscribeAiSocket("session_closed", refreshSessions) wiring --
  // so refreshSessions fires automatically and the list updates
  // with the closed-status row. No local optimistic update needed.
  const onCloseSession = (conversation: CommunicationConversation) => {
    const wsSessionId = conversation.sessionId ?? conversation.id;
    const sent = closeChatSession(wsSessionId);
    if (!sent) {
      setError("Unable to close session right now.");
    }
  };

  // BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_SEND_v1 -- replace the
  // 404'd HTTP send (/api/communications/threads/<id>/messages
  // does not exist on BF-Server) with the WS frame. The server
  // persists to chat_messages and broadcasts staff_message; the
  // panel's existing subscribeAiSocket("new_chat_message",
  // refreshSessions) listener then refreshes the session list so
  // the preview updates. The composer clears optimistically on a
  // successful send (socket OPEN); on a failure the error toast
  // appears and the user retries.
  const onSendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!activeSession || !draftMessage.trim() || toSessionStatus(activeSession) === "closed") return;
    const wsSessionId = activeSession.sessionId ?? activeSession.id;
    const sent = sendStaffMessage(wsSessionId, draftMessage.trim());
    if (sent) {
      setDraftMessage("");
    } else {
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
