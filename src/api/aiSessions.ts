import api from "@/api";
import type { AiSession, AiSessionMessage } from "@/features/comms/aiSessions";

export const fetchAiSessions = () => Promise.resolve([] as AiSession[]);

export async function fetchAiMessages(sessionId: string) {
  return api.get<AiSessionMessage[]>(`/api/ai/ai/sessions/${sessionId}/messages`);
}

export async function closeAiSession(sessionId: string) {
  return api.post("/api/ai/ai/close", { sessionId });
}
