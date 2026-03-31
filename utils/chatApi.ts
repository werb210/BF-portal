import { apiRequest } from "@/api/client";

export async function apiCreateConversation(clientId: string, staffUserId: string) {
  return apiRequest("/chat/conversation", {
    method: "POST",
    body: { clientId, staffUserId }
  });
}

export async function apiFetchMessages(conversationId: string) {
  return apiRequest(`/chat/messages/${conversationId}`, {
    method: "GET"
  });
}

export async function apiSendMessage(conversationId: string, senderRole: string, text: string) {
  return apiRequest(`/chat/messages/${conversationId}`, {
    method: "POST",
    body: { senderRole, text }
  });
}
