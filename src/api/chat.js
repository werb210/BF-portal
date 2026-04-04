import api from "@/api";
export async function fetchOpenChats() {
    return api.get("/api/chat/sessions?status=open");
}
export async function fetchChatSession(id) {
    return api.get(`/chat/sessions/${id}`);
}
export async function sendStaffMessage(sessionId, message) {
    return api.post(`/chat/sessions/${sessionId}/message`, { message });
}
export async function closeChatSession(sessionId) {
    return api.post(`/chat/sessions/${sessionId}/close`);
}
