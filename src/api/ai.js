import { apiFetch } from "./client";
export async function sendMessage(input, sessionId) {
    return apiFetch("/api/v1/ai/message", {
        method: "POST",
        body: JSON.stringify({
            message: input,
            sessionId,
        }),
    });
}
export async function fetchActiveChats() {
    return apiFetch("/ai/portal/chats");
}
export async function sendStaffMessage(sessionId, message) {
    return apiFetch("/ai/staff-message", {
        method: "POST",
        body: JSON.stringify({ sessionId, message }),
    });
}
export async function closeChat(sessionId) {
    return apiFetch(`/ai/portal/chats/${sessionId}/close`, {
        method: "POST",
    });
}
