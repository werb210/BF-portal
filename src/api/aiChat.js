import api from "@/api";
export async function fetchAiSessions() {
    const res = await api.get("/api/chat/sessions");
    const sessions = (res.data ?? []);
    return sessions;
}
export async function fetchAiMessages(sessionId) {
    const res = await api.get(`/chat/sessions/${sessionId}/messages`);
    const messages = (res.data ?? []);
    return messages;
}
export async function sendHumanReply(sessionId, content) {
    await api.post(`/chat/sessions/${sessionId}/human-reply`, { content });
}
export async function closeAiSession(sessionId) {
    await api.post(`/chat/sessions/${sessionId}/close`);
}
