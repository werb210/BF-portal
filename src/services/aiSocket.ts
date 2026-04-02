import { API_BASE } from "@/config/api";

const WS_URL = API_BASE.replace(/^http/, "ws");

export type ConnectionEventName = "connecting" | "connected" | "disconnected";

type SocketEventName = "new_chat_message" | "session_timeout" | "session_closed";

type Listener<T> = (payload: T) => void;

const connectionListeners = new Set<Listener<ConnectionEventName>>();
const socketListeners = new Map<SocketEventName, Set<Listener<unknown>>>();

export function buildAiSocketUrl(path = "/ws/chat") {
  return `${WS_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function connectAiSocket() {
  connectionListeners.forEach((listener) => listener("connected"));
}

export function reconnectAiSocket() {
  connectionListeners.forEach((listener) => listener("connecting"));
  connectAiSocket();
}

export function subscribeAiSocket(event: SocketEventName, listener: Listener<unknown>) {
  const listeners = socketListeners.get(event) ?? new Set<Listener<unknown>>();
  listeners.add(listener);
  socketListeners.set(event, listeners);
  return () => listeners.delete(listener);
}

export function subscribeAiSocketConnection(listener: Listener<ConnectionEventName>) {
  connectionListeners.add(listener);
  listener("connecting");
  return () => connectionListeners.delete(listener);
}

export { WS_URL };
