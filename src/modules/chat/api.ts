import api from "@/lib/apiClient";
import type { ChatMessage, ChatSession } from "./types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) {
        throw new Error("FAILED_AFTER_RETRY", { cause: error });
      }
      await wait(delayMs);
    }
  }

  throw new Error("FAILED_AFTER_RETRY");
}

export const getHumanSessions = async () => {
  const res = await retry(() => api.get<ChatSession[]>("/chat/sessions", { params: { status: "human" } }));
  return res;
};

export const getMessages = async (sessionId: string) => {
  const res = await retry(() => api.get<ChatMessage[]>(`/chat/${sessionId}/messages`));
  return res;
};

export const sendStaffMessage = async (sessionId: string, message: string) => {
  const res = await api.post<ChatMessage>("/chat/message", {
    sessionId,
    message,
    role: "staff"
  });
  return res;
};

export const closeSession = async (sessionId: string) => {
  const res = await api.post<{ success: boolean }>("/chat/close", {
    sessionId
  });
  return res;
};
