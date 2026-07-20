import api, { apiGetEnvelope } from "@/api";
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
  tags?: string[] | null; // BF_PORTAL_BLOCK_v811_TAGS_COLUMN
  source?: string | null; // BF_PORTAL_CONTACT_SOURCE_v1
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  secondary_email?: string; // BF_PORTAL_CONTACT_SECONDARY_v1
  secondary_phone?: string;
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
  applicationIds?: string[];
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
  // BF_PORTAL_TIMELINE_KINDS_v1 - the server also emits 'voicemail', 'sms' and
  // 'system'; this union omitted them, which is part of why they never rendered.
  kind: "note" | "task" | "call" | "email" | "meeting" | "voicemail" | "sms" | "system";
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

// BF_PORTAL_CRM_TOTALS_v1
export type PagedEnvelope<T> = { data?: T[]; meta?: { page?: number; pageSize?: number; total?: number } } | T[];

function unwrapPaged<T>(r: any): { rows: T[]; total: number } {
  const rows: T[] = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
  // Older responses carry no meta.total; fall back to the row count so the caller
  // degrades to "one page" rather than rendering a broken pager.
  const total = Number(r?.meta?.total ?? rows.length);
  return { rows, total };
}

function unwrap<T>(r: any): T {
  if (r && typeof r === "object" && "data" in r) return r.data as T;
  return r as T;
}

export const crmApi = {
  // Lists
  listContacts: (params: Record<string, string | number | undefined> = {}) =>
    api.get<{ data?: ContactRow[] } | ContactRow[]>(`/api/crm/contacts`, { params }).then(unwrap<ContactRow[]>),
  // BF_PORTAL_CRM_TOTALS_v1 - unwrap() throws away the envelope's `meta`, so a caller
  // needing the real total (for a pager) cannot use listContacts. These keep it.
  // BF_PORTAL_ENVELOPE_GET_v1 - MUST use apiGetEnvelope, not api.get: api.get strips the
  // envelope down to `data`, so meta.total was lost and the pager fell back to
  // rows.length - which reported "1-200 of 200" on a 2,428-row table and disabled Next.
  listContactsPaged: (params: Record<string, string | number | undefined> = {}) =>
    apiGetEnvelope<PagedEnvelope<ContactRow>>(`/api/crm/contacts`, { params }).then(unwrapPaged<ContactRow>),
  listCompaniesPaged: (params: Record<string, string | number | undefined> = {}) =>
    apiGetEnvelope<PagedEnvelope<CompanyRow>>(`/api/crm/companies`, { params }).then(unwrapPaged<CompanyRow>),
  bulkDeleteContacts: (ids: string[]) => api.post("/api/crm/contacts/bulk-delete", { ids }),
  bulkTagContacts: (ids: string[], tag: string) => api.post("/api/crm/contacts/bulk-tag", { ids, tags: [tag], op: "add" }), // BF_PORTAL_BLOCK_v802_ACTIVE_TAG — server expects {tags[],op}, not {tag}
  bulkAssignContacts: (ids: string[], ownerUserId: string) => api.post("/api/crm/contacts/bulk-assign", { ids, ownerUserId }),
  bulkDeleteCompanies: (ids: string[]) => api.post("/api/crm/companies/bulk-delete", { ids }),
  bulkTagCompanies: (ids: string[], tag: string) => api.post("/api/crm/companies/bulk-tag", { ids, tags: [tag], op: "add" }), // BF_PORTAL_BLOCK_v802_ACTIVE_TAG
  bulkAssignCompanies: (ids: string[], ownerUserId: string) => api.post("/api/crm/companies/bulk-assign", { ids, ownerUserId }),
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
