import api from "@/api";
export async function fetchAiSessions() {
    return api.get("/chat/sessions");
}
export async function fetchAiMessages(sessionId) {
    return api.get(`/chat/sessions/${sessionId}/messages`);
}
export async function closeAiSession(sessionId) {
    return api.post(`/chat/sessions/${sessionId}/close`);
}
