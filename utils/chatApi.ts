import { withApiBase } from "../src/lib/apiBase";

export async function apiCreateConversation(clientId: string, staffUserId: string) {
  const r = await fetch(withApiBase("/api/chat/conversation"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, staffUserId }),
  });
  return r.json();
}

export async function apiFetchMessages(conversationId: string) {
  const r = await fetch(withApiBase(`/api/chat/messages/${conversationId}`));
  return r.json();
}

export async function apiSendMessage(conversationId: string, senderRole: string, text: string) {
  const r = await fetch(withApiBase(`/api/chat/messages/${conversationId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderRole, text }),
  });
  return r.json();
}
