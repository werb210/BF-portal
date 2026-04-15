import api from "@/api";
import type { AiSession, AiSessionMessage } from "@/features/comms/aiSessions";

export async function fetchAiSessions() {
  return api.get<AiSession[]>("/api/ai/ai/sessions");
}

export async function fetchAiMessages(sessionId: string) {
  return api.get<AiSessionMessage[]>(`/api/ai/ai/sessions/${sessionId}/messages`);
}

export async function closeAiSession(sessionId: string) {
  return api.post("/api/ai/ai/close", { sessionId });
}
