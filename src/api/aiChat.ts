import api from "@/api/client";

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
  return res.data;
}

export async function fetchAiMessages(sessionId: string): Promise<AiMessage[]> {
  const res = await api.get(`/api/chat/sessions/${sessionId}/messages`);
  return res.data;
}

export async function sendHumanReply(sessionId: string, content: string) {
  await api.post(`/api/chat/sessions/${sessionId}/human-reply`, { content });
}

export async function closeAiSession(sessionId: string) {
  await api.post(`/api/chat/sessions/${sessionId}/close`);
}
