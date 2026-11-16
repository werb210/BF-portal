// BF_PORTAL_v966_MEETING_CHAT - the Teams meeting's own chat, inside the in-portal meeting screen.
//
// A staff member who joined as themselves is a real Teams user, and Teams chat for real users goes through
// Microsoft Graph (the calling kit has no chat for them). The portal asks Microsoft for the chat permission the
// first time Chat is opened (silently when it can, otherwise one Microsoft window), then reads and posts to the
// meeting's chat thread directly. Guests (clients in the client app) have no Teams account, so no chat for them.
import { msalClient } from "@/auth/msal";

export const CHAT_SCOPES = ["https://graph.microsoft.com/Chat.ReadWrite"];
export type ChatMessage = { id: string; from: string; text: string; at: string; mine: boolean };
type MsalLike = {
  initialize?: () => Promise<void>;
  getActiveAccount: () => unknown;
  getAllAccounts: () => unknown[];
  acquireTokenSilent: (r: any) => Promise<{ accessToken?: string }>;
  acquireTokenPopup?: (r: any) => Promise<{ accessToken?: string }>;
};
const reason = (e: unknown): string => (e as { errorCode?: string; message?: string } | null)?.errorCode || (e as Error | null)?.message || String(e);

/** A Microsoft token for the meeting chat, or the reason there is none. */
export async function chatToken(interactive: boolean, client: MsalLike = msalClient as any): Promise<{ token: string } | { error: string }> {
  let account: unknown = null;
  try {
    if (client.initialize) await client.initialize();
    account = client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
    if (!account) throw new Error("no_account");
    const r = await client.acquireTokenSilent({ account, scopes: CHAT_SCOPES });
    if (r?.accessToken) return { token: String(r.accessToken) };
    throw new Error("no_access_token");
  } catch (err) {
    if (!interactive || !client.acquireTokenPopup) return { error: reason(err) };
    try {
      const r = await client.acquireTokenPopup({ scopes: CHAT_SCOPES, account: account ?? undefined });
      return r?.accessToken ? { token: String(r.accessToken) } : { error: "no_access_token" };
    } catch (popupErr) {
      return { error: reason(popupErr) };
    }
  }
}

/** Teams sends chat as HTML; show it as plain text. */
export function plainText(html: unknown): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

/** Graph's newest-first page of a chat, as oldest-first messages people wrote (system events dropped). */
export function toMessages(rows: unknown, myUserId: string): ChatMessage[] {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .filter((m: any) => m && m.messageType === "message" && !m.deletedDateTime)
    .map((m: any): ChatMessage => ({
      id: String(m.id),
      from: String(m.from?.user?.displayName ?? m.from?.application?.displayName ?? "Someone"),
      text: plainText(m.body?.content),
      at: String(m.createdDateTime ?? ""),
      mine: Boolean(myUserId) && String(m.from?.user?.id ?? "").toLowerCase() === myUserId.toLowerCase(),
    }))
    .filter((m) => m.text)
    .sort((a, b) => a.at.localeCompare(b.at));
}

const chatUrl = (threadId: string) => "https://graph.microsoft.com/v1.0/chats/" + encodeURIComponent(threadId) + "/messages";

export async function listChat(threadId: string, token: string, myUserId: string, fetcher: typeof fetch = fetch): Promise<ChatMessage[]> {
  const r = await fetcher(chatUrl(threadId) + "?$top=40", { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("chat_read_" + r.status);
  return toMessages(((await r.json()) as { value?: unknown }).value, myUserId);
}

export async function sendChat(threadId: string, token: string, text: string, fetcher: typeof fetch = fetch): Promise<void> {
  const content = text.trim();
  if (!content) return;
  const r = await fetcher(chatUrl(threadId), {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ body: { contentType: "text", content: content.slice(0, 4000) } }),
  });
  if (!r.ok) throw new Error("chat_send_" + r.status);
}
