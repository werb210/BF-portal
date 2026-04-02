import { http } from "@/api/httpClient";
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

const unwrap = async <T>(call: Promise<ReturnType<typeof http.get<T>> extends Promise<infer R> ? R : never>) => {
  const res = await call;
  if (!res.success) throw new Error("error" in res ? res.error : "Request failed");
  return res.data as T;
};

export const fetchCommunicationThreads = (businessUnit?: string) =>
  unwrap<CommunicationConversation[]>(http.get(`/communications/threads${businessUnit ? `?businessUnit=${businessUnit}` : ""}`));

export const fetchConversationById = (id: string) => unwrap<CommunicationConversation>(http.get(`/communications/threads/${id}`));
export const fetchCrmLeads = () => unwrap<CrmLead[]>(http.get("/communications/leads"));

export const sendCommunication = (conversationId: string, body: string, channel: CommunicationType = "chat") =>
  unwrap<CommunicationMessage>(http.post(`/communications/threads/${conversationId}/messages`, { body, channel }));

export const receiveInboundMessage = (conversationId: string, body: string, channel: CommunicationType, silo: string) =>
  unwrap<CommunicationMessage>(http.post(`/communications/threads/${conversationId}/inbound`, { body, channel, silo }));

export const createHumanEscalation = (payload: Record<string, unknown>) =>
  unwrap<CommunicationConversation>(http.post("/communications/escalations", payload));

export const createIssueReport = (payload: Record<string, unknown>) =>
  unwrap<CommunicationConversation>(http.post("/communications/issues", payload));

export const acknowledgeIssue = (conversationId: string) =>
  unwrap<CommunicationConversation>(http.post(`/communications/issues/${conversationId}/acknowledge`));

export const archiveIssue = (conversationId: string) =>
  unwrap<CommunicationConversation>(http.post(`/communications/issues/${conversationId}/archive`));

export const deleteIssue = (conversationId: string) => unwrap<{ success: boolean }>(http.delete(`/communications/issues/${conversationId}`));

export const applyHumanActiveState = (conversationId: string) =>
  unwrap<CommunicationConversation>(http.post(`/communications/threads/${conversationId}/human-active`));

export const closeEscalatedChat = (conversationId: string, transcript?: string) =>
  unwrap<CommunicationConversation>(http.post(`/communications/threads/${conversationId}/close`, { transcript }));

export const attachTranscriptToLead = (conversationId: string, transcript: string) =>
  unwrap<{ success: boolean }>(http.post(`/communications/threads/${conversationId}/transcript`, { transcript }));

export const fetchSmsThread = (contactId: string) => unwrap<SmsMessage[]>(http.get(`/communications/sms/${contactId}`));

export const sendSms = (contact: Contact, body: string, fromNumber: string) =>
  unwrap<SmsMessage>(http.post(`/communications/sms`, { contactId: contact.id, body, fromNumber }));

export const logApplicationCallEvent = (payload: Record<string, unknown>) =>
  unwrap<{ success: boolean }>(http.post("/communications/call-events", payload));
