import { API_BASE } from "@/config/api";

const WS_URL = API_BASE.replace(/^http/, "ws");

export function buildAiSocketUrl(path = "/ws/chat") {
  return `${WS_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { WS_URL };
