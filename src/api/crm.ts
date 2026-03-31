import api from "@/api/client";
import { requireAuth } from "@/utils/requireAuth";
import { useCrmStore } from "@/state/crm.store";
import type { CRMLead } from "@/types/crm";

type ApiLead = Record<string, unknown>;

type ApiResponse<T> = { data?: T } & T;

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  requireAuth();
  const method = (options.method ?? "GET").toUpperCase();
  const payload = options.body ? JSON.parse(String(options.body)) : undefined;

  if (method === "POST") {
    const { data } = await api.post<ApiResponse<T>>(`/api${path}`, payload);
    return (data as { data?: T }).data ?? (data as T);
  }

  if (method === "PATCH") {
    const { data } = await api.patch<ApiResponse<T>>(`/api${path}`, payload);
    return (data as { data?: T }).data ?? (data as T);
  }

  const { data } = await api.get<ApiResponse<T>>(`/api${path}`);
  return (data as { data?: T }).data ?? (data as T);
}

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  silo: "BF" | "BI" | "SLF";
  owner: string;
  tags: string[];
  source?: string;
  hasActiveApplication: boolean;
  companyIds: string[];
  applicationIds: string[];
  referrerId?: string;
  referrerName?: string;
};

export type Company = {
  id: string;
  name: string;
  silo: "BF" | "BI" | "SLF";
  industry: string;
  website?: string;
  owner: string;
  tags: string[];
  contactIds: string[];
  referrerId?: string;
  referrerName?: string;
};

export type TimelineEventType =
  | "call"
  | "sms"
  | "email"
  | "note"
  | "document"
  | "status"
  | "ai"
  | "lender"
  | "system"
  | "RULE_TRIGGERED"
  | "AUTO_SMS_SENT"
  | "AUTO_TASK_CREATED"
  | "FOLLOW_UP_REMINDER";

export type AutomationMetadata = {
  ruleId: string;
  triggerReason: string;
  delayCondition: string;
  action: string;
  internalNotes?: string;
};

export type TimelineEvent = {
  id: string;
  entityId: string;
  entityType: "contact" | "company";
  type: TimelineEventType;
  occurredAt: string;
  direction?: "inbound" | "outbound";
  summary: string;
  details?: string;
  automation?: AutomationMetadata;
  call?: {
    outcome: string;
    durationSeconds: number;
    failureReason?: string | null;
    recordingUrl?: string | null;
  };
};

export const fetchContacts = async () => {
  const { silo, filters } = useCrmStore.getState();
  const params = new URLSearchParams({ silo });

  if (filters.search) params.set("search", filters.search);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.hasActiveApplication) params.set("hasActiveApplication", "true");

  return requestJson<Contact[]>(`/crm/contacts?${params.toString()}`);
};

export const fetchCompanies = async () => {
  const { silo } = useCrmStore.getState();
  const params = new URLSearchParams({ silo });
  return requestJson<Company[]>(`/crm/companies?${params.toString()}`);
};

export const fetchTimeline = async (entityType: "contact" | "company", entityId: string) => {
  const params = new URLSearchParams({ entityType, entityId });
  return requestJson<TimelineEvent[]>(`/crm/timeline?${params.toString()}`);
};

export const createNote = async (entityId: string, summary: string) => requestJson<TimelineEvent>("/crm/timeline/notes", { method: "POST", body: JSON.stringify({ entityId, summary }) });

export const logCallEvent = async (payload: {
  contactId: string;
  number: string;
  durationSeconds: number;
  outcome: string;
  failureReason?: string | null;
}) => requestJson<TimelineEvent>("/crm/timeline/calls", { method: "POST", body: JSON.stringify(payload) });

export const fetchApplications = async (contactId: string) => requestJson<{ id: string; stage: string; contactId: string }[]>(`/crm/contacts/${contactId}/applications`);

export const fetchContactCompanies = async (contact: Contact) => requestJson<Company[]>(`/crm/contacts/${contact.id}/companies`);

export const fetchCompanyContacts = async (company: Company) => requestJson<Contact[]>(`/crm/companies/${company.id}/contacts`);

export const createContact = async (payload: {
  name: string;
  email: string;
  phone: string;
  silo: Contact["silo"];
  owner: string;
  tags?: string[];
  referrerId?: string;
  referrerName?: string;
}) => requestJson<Contact>("/crm/contacts", { method: "POST", body: JSON.stringify(payload) });

export const createCompany = async (payload: {
  name: string;
  silo: Company["silo"];
  industry?: string;
  website?: string;
  owner: string;
  tags?: string[];
  referrerId?: string;
  referrerName?: string;
}) => requestJson<Company>("/crm/companies", { method: "POST", body: JSON.stringify(payload) });

export const linkContactCompany = async (contactId: string, companyId: string) =>
  requestJson<{ contact: Contact; company: Company }>(`/crm/contacts/${contactId}/companies/${companyId}`, { method: "POST" });

export const createContactApplication = async (payload: { contactId: string; stage: string }) => requestJson<{ id: string; stage: string; contactId: string }>("/crm/applications", { method: "POST", body: JSON.stringify(payload) });

export async function fetchLeads() {
  return requestJson<ApiLead[] | { leads?: ApiLead[] }>("/crm/leads");
}

export async function fetchLeadById(id: string) {
  return requestJson(`/crm/leads/${id}`);
}

export async function fetchCreditReadinessLeads(): Promise<CRMLead[]> {
  return requestJson<CRMLead[]>("/crm/credit-readiness");
}

export async function convertReadinessToApplication(id: string) {
  return requestJson(`/crm/credit-readiness/${id}/convert`, { method: "POST" });
}

export async function fetchChatSessions() {
  return requestJson("/chat/sessions");
}

export async function fetchContinuationLeads() {
  return requestJson("/application/continuations");
}

export const getDeals = async () => {
  requireAuth();

  return api.get("/api/crm/deals");
};

export const updateDealStage = async (id: string, stage: string) => {
  requireAuth();

  return api.patch(`/api/crm/deals/${id}`, { stage });
};
