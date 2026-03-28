import { API_BASE_URL } from "@/config/api";

const WS_URL = API_BASE_URL.replace(/^http/, "ws");

export function buildAiSocketUrl(path = "/ws/chat") {
  return `${WS_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { WS_URL };
