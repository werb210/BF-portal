import api from "@/api";

export async function fetchOpenChats() {
  return api.get("/api/ai/ai/sessions?status=open");
}

export async function fetchChatSession(id: string) {
  return api.get(`/api/ai/ai/sessions/${id}`);
}

export async function sendStaffMessage(sessionId: string, message: string) {
  return api.post("/api/ai/ai/message", { sessionId, message });
}

export async function closeChatSession(sessionId: string) {
  return api.post("/api/ai/ai/close", { sessionId });
}
