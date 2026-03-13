import api from "@/api/client";
import type { AiSession, AiSessionMessage } from "@/features/comms/aiSessions";

export async function fetchAiSessions() {
  return api.get<AiSession[]>("/api/chat/sessions");
}

export async function fetchAiMessages(sessionId: string) {
  return api.get<AiSessionMessage[]>(`/api/chat/sessions/${sessionId}/messages`);
}

export async function closeAiSession(sessionId: string) {
  return api.post(`/api/chat/sessions/${sessionId}/close`);
}
