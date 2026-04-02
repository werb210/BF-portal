import { apiFetch } from "./client";

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiSession = {
  id: string;
};

export type AiResponse = {
  session: AiSession;
  messages: AiMessage[];
};

export async function sendMessage(
  input: string,
  sessionId?: string
): Promise<AiResponse> {
  return apiFetch("/api/v1/ai/message", {
    method: "POST",
    body: JSON.stringify({
      message: input,
      sessionId,
    }),
  });
}

export async function fetchActiveChats() {
  return apiFetch("/ai/portal/chats");
}

export async function sendStaffMessage(sessionId: string, message: string) {
  return apiFetch("/ai/staff-message", {
    method: "POST",
    body: JSON.stringify({ sessionId, message }),
  });
}

export async function closeChat(sessionId: string) {
  return apiFetch(`/ai/portal/chats/${sessionId}/close`, {
    method: "POST",
  });
}
