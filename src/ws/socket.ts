// BF_SILO_API_ROUTING_v43 — Block 43 — sockets are BF-only today
import { __apiBaseUrls } from "@/config/api";
const API_BASE = __apiBaseUrls.bf;
import { getToken } from "@/lib/authStore";

const SOCKET_URL = API_BASE.replace(/^http/, "ws");

export function connectSocket() {
  const token = getToken();

  if (!token) {
    return;
  }

  const url = new URL(SOCKET_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/chat";
  url.search = `token=${encodeURIComponent(token)}`;

  const socket = new WebSocket(url.toString());

  return socket;
}
