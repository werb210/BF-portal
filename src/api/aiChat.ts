import api from "@/lib/api";

export interface AiSession {
  id: string;
  companyName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status: "ai" | "human" | "closed";
  createdAt: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "human";
  content: string;
  createdAt: string;
}

export async function fetchAiSessions(): Promise<AiSession[]> {
  const res = await api.get("/api/chat/sessions");
  const sessions: AiSession[] = ((res as { data?: AiSession[] }).data ?? []) as AiSession[];
  return sessions;
}

export async function fetchAiMessages(sessionId: string): Promise<AiMessage[]> {
  const res = await api.get(`/chat/sessions/${sessionId}/messages`);
  const messages: AiMessage[] = ((res as { data?: AiMessage[] }).data ?? []) as AiMessage[];
  return messages;
}

export async function sendHumanReply(sessionId: string, content: string) {
  await api.post(`/chat/sessions/${sessionId}/human-reply`, { content });
}

export async function closeAiSession(sessionId: string) {
  await api.post(`/chat/sessions/${sessionId}/close`);
}
