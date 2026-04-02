import { http } from "@/lib/api";
import type { Contact } from "@/api/crm";

export type CommunicationType = "chat" | "sms" | "human" | "issue" | "system" | "credit_readiness" | "contact_form";

export type CommunicationMessage = {
  id: string;
  conversationId?: string;
  type: CommunicationType;
  direction: "in" | "out" | "system";
  message: string;
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

export const fetchCommunicationThreads = (businessUnit?: string) =>
  http.get<CommunicationConversation[]>(`/communications/threads${businessUnit ? `?businessUnit=${businessUnit}` : ""}`);

export const fetchConversationById = (id: string) => http.get<CommunicationConversation>(`/communications/threads/${id}`);
export const fetchCrmLeads = () => http.get<CrmLead[]>("/communications/leads");

export const sendCommunication = (conversationId: string, body: string, channel: CommunicationType = "chat") =>
  http.post<CommunicationMessage>(`/communications/threads/${conversationId}/messages`, { body, channel });

export const receiveInboundMessage = (conversationId: string, body: string, channel: CommunicationType, silo: string) =>
  http.post<CommunicationMessage>(`/communications/threads/${conversationId}/inbound`, { body, channel, silo });

export const createHumanEscalation = (payload: Record<string, unknown>) =>
  http.post<CommunicationConversation>("/communications/escalations", payload);

export const createIssueReport = (payload: Record<string, unknown>) =>
  http.post<CommunicationConversation>("/communications/issues", payload);

export const acknowledgeIssue = (conversationId: string) =>
  http.post<CommunicationConversation>(`/communications/issues/${conversationId}/acknowledge`);

export const archiveIssue = (conversationId: string) =>
  http.post<CommunicationConversation>(`/communications/issues/${conversationId}/archive`);

export const deleteIssue = (conversationId: string) => http.delete<{ success: boolean }>(`/communications/issues/${conversationId}`);

export const applyHumanActiveState = (conversationId: string) =>
  http.post<CommunicationConversation>(`/communications/threads/${conversationId}/human-active`);

export const closeEscalatedChat = (conversationId: string, transcript?: string) =>
  http.post<CommunicationConversation>(`/communications/threads/${conversationId}/close`, { transcript });

export const attachTranscriptToLead = (conversationId: string, transcript: string) =>
  http.post<{ success: boolean }>(`/communications/threads/${conversationId}/transcript`, { transcript });

export const fetchSmsThread = (contactId: string) => http.get<SmsMessage[]>(`/communications/sms/${contactId}`);

export const sendSms = (contact: Contact, body: string, fromNumber: string) =>
  http.post<SmsMessage>(`/communications/sms`, { contactId: contact.id, body, fromNumber });

export const logApplicationCallEvent = (payload: Record<string, unknown>) =>
  http.post<{ success: boolean }>("/communications/call-events", payload);
