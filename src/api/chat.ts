import api from "@/api/client";

export async function fetchOpenChats() {
  return api.get("/chat/sessions?status=open");
}

export async function fetchChatSession(id: string) {
  return api.get(`/chat/sessions/${id}`);
}

export async function sendStaffMessage(sessionId: string, message: string) {
  return api.post(`/chat/sessions/${sessionId}/message`, { message });
}

export async function closeChatSession(sessionId: string) {
  return api.post(`/chat/sessions/${sessionId}/close`);
}
