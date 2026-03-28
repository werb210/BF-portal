import { API_BASE_URL } from "@/config/api";

const SOCKET_URL = API_BASE_URL.replace(/^http/, "ws");

export function connectSocket() {
  const token = sessionStorage.getItem("bf_token");

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
