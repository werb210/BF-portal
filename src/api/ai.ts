import { apiClient } from "@/lib/apiClient";

type AiSession = { id: string; source?: string; status: string };
type AiMessage = { role: string; content: string };

type AiSessionDetail = {
  session: AiSession;
  messages: AiMessage[];
};

export async function fetchEscalatedSessions() {
  return apiClient.get("/api/ai/escalated");
}

export async function fetchSessionMessages(sessionId: string) {
  return apiClient.get(`/api/ai/session/${sessionId}`);
}

export async function sendStaffMessage(sessionId: string, message: string) {
  return apiClient.post("/api/ai/staff-message", {
    sessionId,
    message,
  });
}

export async function fetchActiveChats() {
  return apiClient.get("/api/ai/portal/chats");
}

export async function sendPortalStaffMessage(sessionId: string, message: string) {
  return apiClient.post(`/api/ai/portal/chats/${sessionId}/message`, { message });
}

export async function closeChat(sessionId: string) {
  return apiClient.post(`/api/ai/portal/chats/${sessionId}/close`);
}

export async function fetchActiveAiSessions() {
  return apiClient.get<AiSession[]>("/api/chat/sessions?status=ai");
}

export async function fetchAiMessages(sessionId: string) {
  return apiClient.get<AiSessionDetail>(`/api/chat/sessions/${sessionId}`);
}

export async function takeOverSession(sessionId: string) {
  return apiClient.post(`/api/chat/sessions/${sessionId}/takeover`);
}

export async function sendSessionStaffMessage(sessionId: string, message: string) {
  return apiClient.post(`/api/chat/sessions/${sessionId}/message`, { message });
}

export async function closeSession(sessionId: string) {
  return apiClient.post(`/api/chat/sessions/${sessionId}/close`);
}
