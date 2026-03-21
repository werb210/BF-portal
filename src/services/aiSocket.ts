import { API_BASE } from "@/config/api";
import { buildNotification } from "@/utils/notifications";
import { useNotificationsStore } from "@/state/notifications.store";

type AiSocketEventName =
  | "escalated_chat"
  | "new_issue_report"
  | "new_chat_message"
  | "HUMAN_ACTIVE"
  | "session_timeout"
  | "session_closed";
export type ConnectionEventName = "connecting" | "connected" | "disconnected";

type AiSocketEventPayload = {
  type?: AiSocketEventName;
  event?: AiSocketEventName;
  title?: string;
  body?: string;
  message?: string;
  chatId?: string;
  issueId?: string;
  sessionId?: string;
};

type Listener = (payload: AiSocketEventPayload) => void;
type ConnectionListener = (state: ConnectionEventName) => void;

const listeners = new Map<AiSocketEventName, Set<Listener>>();
const connectionListeners = new Set<ConnectionListener>();

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 500;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let socket: WebSocket | null = null;
let manuallyClosed = false;

const resolveWebSocketUrl = () => {
  if (!API_BASE || typeof API_BASE !== "string") {
    return "ws://server-url/ws/chat";
  }

  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    const url = new URL(API_BASE);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/chat";
    return url.toString();
  }

  return "ws://server-url/ws/chat";
};

const emitConnection = (state: ConnectionEventName) => {
  connectionListeners.forEach((listener) => listener(state));
};

const notify = (payload: AiSocketEventPayload) => {
  const title = payload.title ?? "AI Support Update";
  const message = payload.message ?? payload.body ?? "You have a new AI support event.";
  useNotificationsStore.getState().addNotification(
    buildNotification(
      {
        title,
        body: message,
        type: "system_alert"
      },
      "in_app"
    )
  );
};

const emit = (event: AiSocketEventName, payload: AiSocketEventPayload) => {
  const handlers = listeners.get(event);
  handlers?.forEach((handler) => handler(payload));
};

const handleMessage = (event: MessageEvent) => {
  let payload: AiSocketEventPayload;
  try {
    payload = JSON.parse(String(event.data)) as AiSocketEventPayload;
  } catch {
    return;
  }

  const eventName = payload.type ?? payload.event;
  if (!eventName) return;

  if (
    eventName === "escalated_chat" ||
    eventName === "new_issue_report" ||
    eventName === "new_chat_message" ||
    eventName === "HUMAN_ACTIVE" ||
    eventName === "session_timeout" ||
    eventName === "session_closed"
  ) {
    notify(payload);
    emit(eventName, payload);
  }
};

const scheduleReconnect = () => {
  if (manuallyClosed || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    emitConnection("disconnected");
    return;
  }

  reconnectAttempts += 1;
  const timeout = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts, 10_000);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectAiSocket();
  }, timeout);
};

export const connectAiSocket = () => {
  if (typeof window === "undefined") return () => undefined;
  manuallyClosed = false;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return () => disconnectAiSocket();
  }

  emitConnection("connecting");
  const wsUrl = resolveWebSocketUrl();
  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    reconnectAttempts = 0;
    emitConnection("connected");
  });

  socket.addEventListener("message", handleMessage);

  socket.addEventListener("close", () => {
    socket = null;
    if (!manuallyClosed) {
      scheduleReconnect();
    } else {
      emitConnection("disconnected");
    }
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });

  return () => disconnectAiSocket();
};

export const disconnectAiSocket = () => {
  manuallyClosed = true;
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  emitConnection("disconnected");
};

export const reconnectAiSocket = () => {
  disconnectAiSocket();
  manuallyClosed = false;
  connectAiSocket();
};

export const subscribeAiSocket = (event: AiSocketEventName, listener: Listener) => {
  const existing = listeners.get(event) ?? new Set<Listener>();
  existing.add(listener);
  listeners.set(event, existing);
  return () => {
    const current = listeners.get(event);
    current?.delete(listener);
  };
};

export const subscribeAiSocketConnection = (listener: ConnectionListener) => {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
};

export const initializeAiSocketClient = () => {
  if (import.meta.env.MODE === "test") return;
  connectAiSocket();
  if (typeof window !== "undefined") {
    (window as Window & { portalRealtime?: { reconnect?: () => void } }).portalRealtime = {
      reconnect: reconnectAiSocket
    };
  }
};
