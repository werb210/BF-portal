import api from "@/api";
import { requireAuth } from "@/utils/requireAuth";
import type { CRMLead } from "@/types/crm";
import { withO365Refresh } from "./o365Interceptor";

type ApiLead = Record<string, unknown>;

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  requireAuth();
  const method = (options.method ?? "GET").toUpperCase();
  const payload = options.body ? JSON.parse(String(options.body)) : undefined;

  if (method === "POST") {
    return api.post<T>(path, payload);
  }

  if (method === "PATCH") {
    return api.patch<T>(path, payload);
  }

  return api.get<T>(path);
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

// BF_PORTAL_BLOCK_v158_DEAD_SILO_STORE_CLEANUP_v1 — fetchContacts removed (dead).
// Real callers use crmApi.listContacts(...) which takes silo as a parameter.

// BF_PORTAL_BLOCK_v158_DEAD_SILO_STORE_CLEANUP_v1 — fetchCompanies removed (dead).
// Real callers use crmApi.listCompanies(...) which takes silo as a parameter.

export const fetchTimeline = async (entityType: "contact" | "company", entityId: string) => {
  const params = new URLSearchParams({ entityType, entityId });
  return requestJson<TimelineEvent[]>(`/api/crm/timeline?${params.toString()}`);
};

export const createNote = async (entityId: string, summary: string) => requestJson<TimelineEvent>("/api/crm/timeline/notes", { method: "POST", body: JSON.stringify({ entityId, summary }) });

export const logCallEvent = async (payload: {
  contactId: string;
  number: string;
  durationSeconds: number;
  outcome: string;
  failureReason?: string | null;
}) => requestJson<TimelineEvent>("/api/crm/timeline/calls", { method: "POST", body: JSON.stringify(payload) });

export const fetchApplications = async (contactId: string) => requestJson<{ id: string; stage: string; contactId: string }[]>(`/api/crm/contacts/${contactId}/applications`);

export const fetchContactCompanies = async (contact: Contact) => requestJson<Company[]>(`/api/crm/contacts/${contact.id}/companies`);

export const fetchCompanyContacts = async (company: Company) => requestJson<Contact[]>(`/api/crm/companies/${company.id}/contacts`);

export const createContact = async (payload: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  silo: Contact["silo"];
  owner: string;
  tags?: string[];
  referrerId?: string;
  referrerName?: string;
}) => requestJson<Contact>("/api/crm/contacts", { method: "POST", body: JSON.stringify(payload) });

export const createCompany = async (payload: {
  name: string;
  silo: Company["silo"];
  industry?: string;
  website?: string;
  owner: string;
  tags?: string[];
  referrerId?: string;
  referrerName?: string;
}) => requestJson<Company>("/api/crm/companies", { method: "POST", body: JSON.stringify(payload) });

export const linkContactCompany = async (contactId: string, companyId: string) =>
  requestJson<{ contact: Contact; company: Company }>(`/api/crm/contacts/${contactId}/companies/${companyId}`, { method: "POST" });

export const createContactApplication = async (payload: { contactId: string; stage: string }) => requestJson<{ id: string; stage: string; contactId: string }>("/api/crm/applications", { method: "POST", body: JSON.stringify(payload) });

export async function fetchLeads() {
  return requestJson<ApiLead[] | { leads?: ApiLead[] }>("/api/crm/leads");
}

export async function fetchLeadById(id: string) {
  return requestJson(`/api/crm/leads/${id}`);
}

export async function fetchCreditReadinessLeads(): Promise<CRMLead[]> {
  return requestJson<CRMLead[]>("/api/crm/credit-readiness");
}

export async function convertReadinessToApplication(id: string) {
  return requestJson(`/api/crm/credit-readiness/${id}/convert`, { method: "POST" });
}

export async function fetchChatSessions() {
  return requestJson("/api/ai/ai/sessions");
}

export async function fetchContinuationLeads() {
  return requestJson("/api/application/continuations");
}

export const getDeals = async () => {
  requireAuth();

  return api.get("/api/crm/deals");
};

export const updateDealStage = async (id: string, stage: string) => {
  requireAuth();

  return api.patch(`/api/crm/deals/${id}`, { stage });
};

// CRM V1 helper API for upcoming pages/popups
export type Scope = { kind: "contact" | "company"; id: string };
const root = (s: Scope) =>
  `/api/crm/${s.kind === "contact" ? "contacts" : "companies"}/${s.id}`;

export type ContactRow = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  company_id?: string | null;
  company_name?: string | null;
  lead_status?: string | null;
  lifecycle_stage?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  role?: string | null;
  ownership_percent?: number | null;
  is_primary_applicant?: boolean | null;
  created_at: string;
};

export type CompanyRow = {
  id: string;
  name: string;
  industry?: string | null;
  domain?: string | null;
  city?: string | null;
  region?: string | null;
  types_of_financing?: string[];
  owner_id?: string | null;
  owner_name?: string | null;
  role?: string | null;
  ownership_percent?: number | null;
  is_primary_applicant?: boolean | null;
  created_at: string;
};

export type TimelineItem = {
  kind: "note" | "task" | "call" | "email" | "meeting";
  id: string;
  ts: string;
  title: string | null;
  body: string | null;
  extra: string | null;
};

export type SharedMailbox = { address: string; display_name: string };
export type SharedMailboxList = { mine: SharedMailbox | null; shared: SharedMailbox[] };

export type InboxMessage = {
  id: string;
  subject: string;
  bodyPreview?: string;
  body?: { content: string; contentType: "html" | "text" };
  from?: { emailAddress?: { address: string; name?: string } };
  receivedDateTime?: string;
  isRead?: boolean;
};

function unwrap<T>(r: any): T {
  if (r && typeof r === "object" && "data" in r) return r.data as T;
  return r as T;
}

export const crmApi = {
  // Lists
  listContacts: (params: Record<string, string | number | undefined> = {}) =>
    api.get<{ data?: ContactRow[] } | ContactRow[]>(`/api/crm/contacts`, { params }).then(unwrap<ContactRow[]>),
  listCompanies: (params: Record<string, string | number | undefined> = {}) =>
    api.get<{ data?: CompanyRow[] } | CompanyRow[]>(`/api/crm/companies`, { params }).then(unwrap<CompanyRow[]>),

  // Detail fetches
  getContact: (id: string) =>
    api.get<{ data?: ContactRow } | ContactRow>(`/api/crm/contacts/${id}`).then(unwrap<ContactRow>),
  getCompany: (id: string) =>
    api.get<{ data?: CompanyRow } | CompanyRow>(`/api/crm/companies/${id}`).then(unwrap<CompanyRow>),

  // Aggregated activity
  timeline: (s: Scope) =>
    api.get<{ data?: TimelineItem[] } | TimelineItem[]>(`${root(s)}/timeline`).then(unwrap<TimelineItem[]>),

  // Sub-resources (one helper per kind)
  notes: {
    list: (s: Scope) => api.get<any>(`${root(s)}/notes`).then(unwrap<any[]>),
    create: (s: Scope, body: { body: string }) => api.post<any>(`${root(s)}/notes`, body),
  },
  tasks: {
    list: (s: Scope) => api.get<any>(`${root(s)}/tasks`).then(unwrap<any[]>),
    create: (s: Scope, body: Record<string, unknown>) => api.post<any>(`${root(s)}/tasks`, body),
    update: (s: Scope, id: string, body: Record<string, unknown>) =>
      api.patch<any>(`${root(s)}/tasks/${id}`, body),
  },
  calls: {
    list: (s: Scope) => api.get<any>(`${root(s)}/calls`).then(unwrap<any[]>),
    create: (s: Scope, body: Record<string, unknown>) => api.post<any>(`${root(s)}/calls`, body),
  },
  emails: {
    list: (s: Scope) => api.get<any>(`${root(s)}/emails`).then(unwrap<any[]>),
    send: (s: Scope, body: {
      from: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body_html: string;
    }) => withO365Refresh(() => api.post<any>(`${root(s)}/emails`, body)),
  },
  meetings: {
    list: (s: Scope) => api.get<any>(`${root(s)}/meetings`).then(unwrap<any[]>),
    create: (s: Scope, body: Record<string, unknown>) =>
      withO365Refresh(() => api.post<any>(`${root(s)}/meetings`, body)),
  },

  // Shared mailbox + inbox
  sharedMailboxes: () =>
    api.get<{ data?: SharedMailboxList } | SharedMailboxList>(`/api/crm/shared-mailboxes`).then(unwrap<SharedMailboxList>),
  inbox: {
    list: (mailbox?: string) =>
      withO365Refresh(() =>
        api.get<{ data?: InboxMessage[] } | InboxMessage[]>(
          `/api/crm/inbox`, { params: mailbox ? { mailbox } : {} },
        ).then(unwrap<InboxMessage[]>)
      ),
    get: (id: string, mailbox?: string) =>
      withO365Refresh(() =>
        api.get<{ data?: InboxMessage } | InboxMessage>(
          `/api/crm/inbox/${encodeURIComponent(id)}`,
          { params: mailbox ? { mailbox } : {} },
        ).then(unwrap<InboxMessage>)
      ),
  },
};
