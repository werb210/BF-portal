import { api } from "@/api";
import { withO365Refresh } from "./o365Interceptor";

export type EmailMessage = {
  id: string;
  contactId: string;
  subject: string;
  folder: "inbox" | "sent" | "archived";
  from: string;
  to: string;
  body: string;
  attachments: string[];
  receivedDateTime?: string;
  isRead?: boolean;
};

type GraphMessage = {
  id: string;
  subject?: string;
  from?: { emailAddress?: { address?: string } };
  toRecipients?: Array<{ emailAddress?: { address?: string } }>;
  bodyPreview?: string;
  body?: { content?: string };
  receivedDateTime?: string;
  isRead?: boolean;
};

function mapGraphToEmail(m: GraphMessage, contactId: string): EmailMessage {
  return {
    id: m.id,
    contactId,
    subject: m.subject ?? "(no subject)",
    folder: "inbox",
    from: m.from?.emailAddress?.address ?? "",
    to: (m.toRecipients ?? []).map((r) => r.emailAddress?.address ?? "").join(", "),
    body: m.body?.content ?? m.bodyPreview ?? "",
    attachments: [],
    receivedDateTime: m.receivedDateTime,
    isRead: m.isRead,
  };
}

export const fetchEmailMessages = async (
  contactId: string,
  folder?: string,
  query?: string,
  contactEmail?: string,
): Promise<EmailMessage[]> => {
  if (!contactEmail) return [];
  try {
    const messages = await withO365Refresh(() => api<GraphMessage[]>("/api/crm/inbox"));
    const lower = contactEmail.trim().toLowerCase();
    const matched = (messages ?? [])
      .filter((m) => {
        const from = m.from?.emailAddress?.address?.toLowerCase() ?? "";
        const tos = (m.toRecipients ?? []).map((r) => r.emailAddress?.address?.toLowerCase() ?? "");
        return from === lower || tos.includes(lower);
      })
      .map((m) => mapGraphToEmail(m, contactId));
    if (!query) return matched;
    const q = query.toLowerCase();
    return matched.filter((m) => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q));
  } catch {
    return [];
  }
};

export const fetchEmailMessage = async (messageId: string): Promise<EmailMessage | undefined> => {
  try {
    const m = await withO365Refresh(() => api<GraphMessage>(`/api/crm/inbox/${encodeURIComponent(messageId)}`));
    return m ? mapGraphToEmail(m, "") : undefined;
  } catch {
    return undefined;
  }
};

// Move a message to the Outlook Archive folder (Graph /messages/{id}/move).
export const archiveEmailMessage = async (contactId: string, messageId: string): Promise<void> => {
  await withO365Refresh(() =>
    api(`/api/crm/contacts/${encodeURIComponent(contactId)}/emails/${encodeURIComponent(messageId)}/archive`, { method: "POST" }),
  );
};

export type EmailPayload = {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
};

export async function sendEmail(payload: EmailPayload) {
  return api.post("/api/o365/mail/send", {
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    cc: payload.cc ?? [],
    bcc: payload.bcc ?? [],
    subject: payload.subject,
    body_html: payload.body,
  });
}
