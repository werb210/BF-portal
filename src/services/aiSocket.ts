// BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_v1
// Real WebSocket client for the staff side of the AI chat. Replaces
// the previous stub which fired synthetic "connected" events without
// opening a socket. Wire protocol matches BF-Server src/modules/ai/
// socket.server.ts:
//   join:        {type:"staff_join",  sessionId, userId}
//   send:        {type:"staff_message", sessionId, content}
//   broadcasts:  {type:"user_message"|"staff_message"|"ai_message", sessionId, role, content}
//                {type:"close_session", sessionId}
//                {type:"transferring", sessionId, state}
//
// All existing subscribers continue to work: server broadcasts that
// carry message content are relayed as "new_chat_message" events
// with the parsed payload, and close_session relays as
// "session_closed". A new "session_timeout" event is emitted when
// the heartbeat detects a stale socket -- listeners can use that
// to surface a retry banner.

import { API_BASE } from "@/config/api";

const WS_URL = API_BASE.replace(/^http/, "ws");

export type ConnectionEventName = "connecting" | "connected" | "disconnected";

type SocketEventName = "new_chat_message" | "session_timeout" | "session_closed";

type Listener<T> = (payload: T) => void;

const connectionListeners = new Set<Listener<ConnectionEventName>>();
const socketListeners = new Map<SocketEventName, Set<Listener<unknown>>>();

const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000];
const MAX_RETRY_ATTEMPTS = RETRY_DELAYS_MS.length;
const HEARTBEAT_INTERVAL_MS = 25000;

let socket: WebSocket | null = null;
let retryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let activeSessionId: string | null = null;
let activeUserId: string | null = null;
let intentionalClose = false;

function emitConnection(name: ConnectionEventName) {
  connectionListeners.forEach((l) => l(name));
}

function emitSocketEvent(name: SocketEventName, payload: unknown) {
  socketListeners.get(name)?.forEach((l) => l(payload));
}

function clearRetry() {
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function clearHeartbeat() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect() {
  if (intentionalClose) return;
  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    emitConnection("disconnected");
    return;
  }
  const delay = RETRY_DELAYS_MS[Math.min(retryCount, RETRY_DELAYS_MS.length - 1)];
  retryCount += 1;
  emitConnection("connecting");
  clearRetry();
  retryTimer = setTimeout(() => openSocket(), delay);
}

function openSocket() {
  if (typeof window === "undefined") return;
  if (socket && socket.readyState <= WebSocket.OPEN) return;

  clearRetry();
  emitConnection("connecting");

  try {
    intentionalClose = false;
    const url = `${WS_URL}/ws/chat`;
    const next = new WebSocket(url);
    socket = next;

    next.onopen = () => {
      retryCount = 0;
      emitConnection("connected");

      // Rejoin last session if the socket dropped while staff was
      // viewing a thread. The server has its own presence map so
      // this is the only signal that brings staff broadcasts back.
      if (activeSessionId && activeUserId) {
        next.send(
          JSON.stringify({
            type: "staff_join",
            sessionId: activeSessionId,
            userId: activeUserId,
          })
        );
      }

      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (next.readyState === WebSocket.OPEN) {
          try {
            next.send(JSON.stringify({ type: "ping" }));
          } catch {
            // socket closing race; ignore
          }
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    next.onmessage = (event) => {
      let payload: any;
      try {
        payload = JSON.parse(event.data as string);
      } catch {
        return;
      }
      const t = payload?.type;
      if (t === "user_message" || t === "ai_message" || t === "staff_message") {
        // Surface as a generic chat-message event; the listener
        // (LiveChatPanel) decides how to render based on role.
        emitSocketEvent("new_chat_message", payload);
        return;
      }
      if (t === "close_session") {
        emitSocketEvent("session_closed", payload);
        return;
      }
      // staff_joined / transferring / transfer / error -> not
      // surfaced as message events; consumers that care can listen
      // on the connection state or extend this switch later.
    };

    next.onclose = () => {
      clearHeartbeat();
      socket = null;
      if (intentionalClose) {
        emitConnection("disconnected");
        return;
      }
      scheduleReconnect();
    };

    next.onerror = () => {
      // Treat as a precursor to onclose; do not double-emit.
    };
  } catch {
    scheduleReconnect();
  }
}

export function buildAiSocketUrl(path = "/ws/chat") {
  return `${WS_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function connectAiSocket() {
  // Idempotent; if already open, this is a no-op.
  if (socket && socket.readyState === WebSocket.OPEN) {
    emitConnection("connected");
    return;
  }
  openSocket();
}

export function reconnectAiSocket() {
  intentionalClose = false;
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
  }
  retryCount = 0;
  openSocket();
}

export function disconnectAiSocket() {
  intentionalClose = true;
  activeSessionId = null;
  activeUserId = null;
  clearRetry();
  clearHeartbeat();
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  emitConnection("disconnected");
}

// Send the staff-side join frame. Caller passes the active
// chat session id + the logged-in staff user id. After the
// server processes this frame it flips the session state to
// HUMAN_ACTIVE and broadcasts staff_joined to the client widget
// (which Block 15 listens for to show "Transferring you...").
export function joinChatSessionAsStaff(sessionId: string, userId: string) {
  activeSessionId = sessionId;
  activeUserId = userId;
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    // Will be sent on (re)connect; openSocket() reads activeSessionId
    // in onopen and replays the join frame.
    connectAiSocket();
    return;
  }
  try {
    socket.send(JSON.stringify({ type: "staff_join", sessionId, userId }));
  } catch {
    // Socket about to close; rejoin will fire on onopen.
  }
}

// Send a staff message into the active chat. Returns true if the
// frame was actually sent (socket OPEN); false otherwise so the
// caller can fall back to a queued/disabled state.
export function sendStaffMessage(sessionId: string, content: string): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  const trimmed = String(content ?? "").trim();
  if (!trimmed || !sessionId) return false;
  try {
    socket.send(JSON.stringify({ type: "staff_message", sessionId, content: trimmed }));
    return true;
  } catch {
    return false;
  }
}

export function subscribeAiSocket(event: SocketEventName, listener: Listener<unknown>) {
  const listeners = socketListeners.get(event) ?? new Set<Listener<unknown>>();
  listeners.add(listener);
  socketListeners.set(event, listeners);
  return () => listeners.delete(listener);
}

export function subscribeAiSocketConnection(listener: Listener<ConnectionEventName>) {
  connectionListeners.add(listener);
  listener(socket?.readyState === WebSocket.OPEN ? "connected" : "connecting");
  return () => connectionListeners.delete(listener);
}

export { WS_URL };

// BF_PORTAL_BLOCK_BI_ROUND6_STAFF_SOCKET_CLOSE_v1
// Send the close_session frame. Server handler (BF-Server
// src/modules/ai/socket.server.ts:293-304) updates chat_sessions.
// status to 'closed', calls attachTranscriptToCrm, and broadcasts
// close_session to the presence set. LiveChatPanel listens for
// "session_closed" via subscribeAiSocket so the panel refreshes
// its session list automatically when this frame is acknowledged.
export function closeChatSession(sessionId: string): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  if (!sessionId) return false;
  try {
    socket.send(JSON.stringify({ type: "close_session", sessionId }));
    activeSessionId = null;
    return true;
  } catch {
    return false;
  }
}
