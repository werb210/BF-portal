// @ts-nocheck
import { useEffect } from "react";
import { getToken } from "@/auth/token";

type AiSocketStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

type ConnectOptions = {
  onMessage: (msg: unknown) => void;
  onStatus?: (status: AiSocketStatus) => void;
  onError?: (message: string) => void;
  maxReconnectAttempts?: number;
};

const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_ATTEMPTS = 6;

const resolveSocketUrl = (sessionId: string, token: string | null) => {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = new URL(`${protocol}://${location.host}/ws/chat`);
  url.searchParams.set("sessionId", sessionId);
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
};

export function connectToAiSession(sessionId: string, options: ConnectOptions) {
  if (!sessionId?.trim()) {
    options.onError?.("Missing sessionId for chat socket.");
    options.onStatus?.("disconnected");
    return () => undefined;
  }

  const token = getToken();
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: number | null = null;
  let manuallyClosed = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const cleanup = () => {
    manuallyClosed = true;
    clearReconnectTimer();
    ws?.close();
    ws = null;
    options.onStatus?.("disconnected");
  };

  const openSocket = () => {
    options.onStatus?.(reconnectAttempts > 0 ? "reconnecting" : "connecting");
    ws = new WebSocket(resolveSocketUrl(sessionId, token));

    ws.addEventListener("open", () => {
      reconnectAttempts = 0;
      options.onStatus?.("connected");
    });

    ws.addEventListener("message", (event) => {
      try {
        options.onMessage(JSON.parse(String(event.data)));
      } catch {
        // ignore malformed events
      }
    });

    ws.addEventListener("close", () => {
      ws = null;
      if (manuallyClosed) {
        options.onStatus?.("disconnected");
        return;
      }

      reconnectAttempts += 1;
      const maxAttempts = options.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS;
      if (reconnectAttempts > maxAttempts) {
        options.onError?.("Live chat disconnected. Reconnect limit reached.");
        options.onStatus?.("disconnected");
        return;
      }

      const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts, 10_000);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        openSocket();
      }, delay);
    });

    ws.addEventListener("error", () => {
      options.onError?.("Live chat connection issue. Retrying...");
      ws?.close();
    });
  };

  openSocket();
  return cleanup;
}

export function useAiSocket(
  sessionId: string | null,
  onMessage: (msg: unknown) => void,
  options?: Omit<ConnectOptions, "onMessage">
) {
  useEffect(() => {
    if (!sessionId) return;
    const disconnect = connectToAiSession(sessionId, { ...options, onMessage });
    return disconnect;
  }, [sessionId, onMessage, options?.onError, options?.onStatus, options?.maxReconnectAttempts]);
}
