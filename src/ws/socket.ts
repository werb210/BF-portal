import { API_BASE } from "@/config/api";
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
