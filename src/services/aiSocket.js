import { API_BASE } from "@/config/api";
const WS_URL = API_BASE.replace(/^http/, "ws");
const connectionListeners = new Set();
const socketListeners = new Map();
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
export function subscribeAiSocket(event, listener) {
    const listeners = socketListeners.get(event) ?? new Set();
    listeners.add(listener);
    socketListeners.set(event, listeners);
    return () => listeners.delete(listener);
}
export function subscribeAiSocketConnection(listener) {
    connectionListeners.add(listener);
    listener("connecting");
    return () => connectionListeners.delete(listener);
}
export { WS_URL };
