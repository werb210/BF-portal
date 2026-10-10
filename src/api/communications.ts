import { http } from "@/api";
import type { Contact } from "@/api/crm";

export type CommunicationType = "chat" | "sms" | "human" | "issue" | "system" | "credit_readiness" | "contact_form" | "voicemail";

export type CommunicationMessage = {
  id: string;
  conversationId?: string;
  type: CommunicationType;
  direction: "in" | "out" | "system";
  message: string;
  mediaUrl?: string;
  mediaDurationSeconds?: number;
  createdAt: string;
};

export type CommunicationConversation = {
  id: string;
  sessionId?: string;
  readinessToken?: string;
  type: CommunicationType;
  status: "open" | "human" | "closed" | "ai";
  silo: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  applicationId?: string;
  applicationName?: string;
  message?: string;
  assignedTo?: string;
  unread?: number;
  highlighted?: boolean;
  leadId?: string;
  lead_id?: string;
  acknowledged?: boolean;
  metadata?: Record<string, unknown>;
  messages: CommunicationMessage[];
  updatedAt: string;
};

export type CrmLead = {
  id: string;
  company?: string;
  fullName?: string;
  industry?: string;
  revenue?: number;
  email?: string;
  phone?: string;
  tags?: string[];
  transcriptIds?: string[];
  conversationIds?: string[];
};

export type SmsMessage = {
  id: string;
  message: string;
  direction: "in" | "out";
  createdAt: string;
};

export const deleteIssue = (conversationId: string) => http.delete<{ success: boolean }>(`/api/communications/issues/${conversationId}`);

// BF_PORTAL_BLOCK_BI_ROUND6_SMS_THREAD_PATH_v1 -- server provides
// /api/communications/sms/thread?contactId=..., not the path-keyed
// /api/communications/sms/<id>. Rewriting the client matches the
// existing server contract without a server-side migration.
export const fetchSmsThread = (contactId: string) =>
  http.get<SmsMessage[]>(`/api/communications/sms/thread?contactId=${encodeURIComponent(contactId)}`);

export const sendSms = (contact: Contact, body: string, fromNumber: string) =>
  http.post<SmsMessage>(`/api/communications/sms`, { contactId: contact.id, body, fromNumber });

export const logApplicationCallEvent = (payload: Record<string, unknown>) =>
  http.post<{ success: boolean }>("/api/communications/call-events", payload);
