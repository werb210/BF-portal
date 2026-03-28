import { get, post } from "@/api/client";

type AiSession = { id: string; source?: string; status: string };
type AiMessage = { role: string; content: string };

type AiSessionDetail = {
  session: AiSession;
  messages: AiMessage[];
};

export async function fetchEscalatedSessions() {
  const res = await get("/ai/escalated");
  return res;
}

export async function fetchSessionMessages(sessionId: string) {
  const res = await get(`/ai/session/${sessionId}`);
  return res;
}

export async function sendStaffMessage(sessionId: string, message: string) {
  const res = await post("/ai/staff-message", {
    sessionId,
    message,
  });
  return res;
}

export async function fetchActiveChats() {
  const res = await get("/ai/portal/chats");
  return res;
}

export async function sendPortalStaffMessage(sessionId: string, message: string) {
  const res = await post(`/ai/portal/chats/${sessionId}/message`, { message });
  return res;
}

export async function closeChat(sessionId: string) {
  const res = await post(`/ai/portal/chats/${sessionId}/close`);
  return res;
}

export async function fetchActiveAiSessions() {
  const res = await get<AiSession[]>("/chat/sessions?status=ai");
  return res;
}

export async function fetchAiMessages(sessionId: string) {
  const res = await get<AiSessionDetail>(`/chat/sessions/${sessionId}`);
  return res;
}

export async function takeOverSession(sessionId: string) {
  const res = await post(`/chat/sessions/${sessionId}/takeover`);
  return res;
}

export async function sendSessionStaffMessage(sessionId: string, message: string) {
  const res = await post(`/chat/sessions/${sessionId}/message`, { message });
  return res;
}

export async function closeSession(sessionId: string) {
  const res = await post(`/chat/sessions/${sessionId}/close`);
  return res;
}
