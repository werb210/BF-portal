import { API_BASE } from "@/config/api";

export function connectSocket() {
  const token = localStorage.getItem("bf_token");

  if (!token) {
    return;
  }

  const url = new URL(API_BASE);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/chat";
  url.search = `token=${encodeURIComponent(token)}`;

  const socket = new WebSocket(url.toString());

  return socket;
}
