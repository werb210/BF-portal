import { api } from "@/api";

export const getOpenSessions = () => Promise.resolve([]);
export const getSession = (id: string) => api.get(`/api/ai/ai/sessions/${id}`).catch(() => null);
export const sendMessage = (sessionId: string, message: string) =>
  api.post("/api/ai/ai/message", { sessionId, content: message });
export const closeSession = (sessionId: string) =>
  api.post("/api/ai/ai/close", { sessionId });

export const fetchOpenChats = getOpenSessions;
export const fetchChatSession = getSession;
export const sendStaffMessage = sendMessage;
export const closeChatSession = closeSession;
