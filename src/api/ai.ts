import api from "./client";

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
  const response = await api.post("/api/ai/message", {
    message: input,
    sessionId,
  });
  return response.data;
}

export async function fetchActiveChats() {
  const response = await api.get("/ai/portal/chats");
  return response.data;
}

export async function sendStaffMessage(sessionId: string, message: string) {
  const response = await api.post("/ai/staff-message", { sessionId, message });
  return response.data;
}

export async function closeChat(sessionId: string) {
  const response = await api.post(`/ai/portal/chats/${sessionId}/close`);
  return response.data;
}
