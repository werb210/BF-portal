import { API_BASE } from "@/lib/api";

const SOCKET_URL = API_BASE.replace(/^http/, "ws");

export function connectSocket() {
  const token = localStorage.getItem("bf_token");

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
