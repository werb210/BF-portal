import api from "@/api/client";
import { apiClient } from "@/lib/apiClient";
import { useCrmStore } from "@/state/crm.store";
import type { CRMLead } from "@/types/crm";

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

const contacts: Contact[] = [
  {
    id: "c1",
    name: "Jane Doe",
    phone: "+1-555-111-2222",
    email: "jane@example.com",
    silo: "BF",
    owner: "Alex",
    tags: ["VIP", "startup_interest"],
    source: "ai",
    hasActiveApplication: true,
    companyIds: ["co1"],
    applicationIds: ["app-1001"]
  },
  {
    id: "c2",
    name: "John Smith",
    phone: "+1-555-333-4444",
    email: "john@smith.com",
    silo: "SLF",
    owner: "Taylor",
    tags: ["Follow-up"],
    source: "website_contact",
    hasActiveApplication: false,
    companyIds: ["co2"],
    applicationIds: [],
    referrerId: "ref-22",
    referrerName: "Morgan Lee"
  },
  {
    id: "c3",
    name: "Bella Investor",
    phone: "+1-555-777-8888",
    email: "bella@invest.com",
    silo: "BI",
    owner: "Alex",
    tags: ["Repeat"],
    source: "credit_readiness",
    hasActiveApplication: true,
    companyIds: [],
    applicationIds: ["app-2002"]
  }
];

const companies: Company[] = [
  {
    id: "co1",
    name: "Boreal Finance",
    silo: "BF",
    industry: "Finance",
    owner: "Alex",
    tags: ["Key"],
    contactIds: ["c1"]
  },
  {
    id: "co2",
    name: "Sunrise Lending",
    silo: "SLF",
    industry: "Lending",
    owner: "Taylor",
    tags: ["Partner"],
    contactIds: ["c2"],
    referrerId: "ref-22",
    referrerName: "Morgan Lee"
  }
];

const crmApplications: { id: string; stage: string; contactId: string }[] = [
  { id: "app-1001", stage: "Underwriting", contactId: "c1" },
  { id: "app-2002", stage: "Submitted", contactId: "c3" }
];

const timelineEvents: TimelineEvent[] = [
  {
    id: "t1",
    entityId: "c1",
    entityType: "contact",
    type: "call",
    direction: "outbound",
    occurredAt: new Date().toISOString(),
    summary: "Outbound call to Jane",
    details: "Discussed application status.",
    call: {
      outcome: "completed",
      durationSeconds: 245,
      failureReason: null,
      recordingUrl: null
    }
  },
  {
    id: "t2",
    entityId: "c1",
    entityType: "contact",
    type: "sms",
    direction: "inbound",
    occurredAt: new Date().toISOString(),
    summary: "SMS from Jane",
    details: "Thanks for the call!"
  },
  {
    id: "t3",
    entityId: "c1",
    entityType: "contact",
    type: "email",
    direction: "outbound",
    occurredAt: new Date().toISOString(),
    summary: "Sent approval docs",
    details: "Attached approval documents"
  },
  {
    id: "t4",
    entityId: "c1",
    entityType: "contact",
    type: "note",
    occurredAt: new Date().toISOString(),
    summary: "Internal note",
    details: "Schedule follow-up"
  },
  {
    id: "t5",
    entityId: "c1",
    entityType: "contact",
    type: "document",
    occurredAt: new Date().toISOString(),
    summary: "Document uploaded",
    details: "ID verification"
  },
  {
    id: "t6",
    entityId: "c1",
    entityType: "contact",
    type: "status",
    occurredAt: new Date().toISOString(),
    summary: "Status changed",
    details: "Moved to underwriting"
  },
  {
    id: "t7",
    entityId: "c1",
    entityType: "contact",
    type: "ai",
    occurredAt: new Date().toISOString(),
    summary: "AI recommendation",
    details: "Suggested product switch"
  },
  {
    id: "t8",
    entityId: "c1",
    entityType: "contact",
    type: "lender",
    occurredAt: new Date().toISOString(),
    summary: "Lender update",
    details: "Awaiting documents"
  },
  {
    id: "t9",
    entityId: "c1",
    entityType: "contact",
    type: "system",
    occurredAt: new Date().toISOString(),
    summary: "System action",
    details: "Auto-reminder sent"
  },
  {
    id: "t10",
    entityId: "c1",
    entityType: "contact",
    type: "RULE_TRIGGERED",
    occurredAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    summary: "Important email not opened",
    details: "Rule evaluation detected no open activity.",
    automation: {
      ruleId: "rule-1024",
      triggerReason: "No email open within 24 hours",
      delayCondition: "24h since email sent",
      action: "Trigger follow-up automation",
      internalNotes: "Escalate if no response after SMS."
    }
  },
  {
    id: "t11",
    entityId: "c1",
    entityType: "contact",
    type: "AUTO_SMS_SENT",
    occurredAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    summary: "SMS reminder sent",
    details: "Automated SMS sent to contact.",
    automation: {
      ruleId: "rule-1024",
      triggerReason: "Email unopened",
      delayCondition: "3m after rule trigger",
      action: "Send SMS reminder"
    }
  },
  {
    id: "t12",
    entityId: "c1",
    entityType: "contact",
    type: "AUTO_TASK_CREATED",
    occurredAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    summary: "Follow-up task created",
    details: "Task assigned to owner for outreach.",
    automation: {
      ruleId: "rule-1024",
      triggerReason: "No engagement after SMS",
      delayCondition: "5m after SMS",
      action: "Create follow-up task"
    }
  },
  {
    id: "t13",
    entityId: "c1",
    entityType: "contact",
    type: "FOLLOW_UP_REMINDER",
    occurredAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    summary: "Reminder scheduled",
    details: "Reminder queued for staff review.",
    automation: {
      ruleId: "rule-1024",
      triggerReason: "Pending task without response",
      delayCondition: "15m after task creation",
      action: "Notify assigned staff"
    }
  }
];

const delay = async <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 10));

export const fetchContacts = async () => {
  const { silo, filters } = useCrmStore.getState();
  const filtered = contacts.filter((contact) => contact.silo === silo);

  const searchNormalized = filters.search.toLowerCase();
  const searched = searchNormalized
    ? filtered.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchNormalized) ||
          contact.email.toLowerCase().includes(searchNormalized) ||
          contact.phone.includes(filters.search)
      )
    : filtered;

  const ownerFiltered = filters.owner
    ? searched.filter((contact) => contact.owner === filters.owner)
    : searched;

  const withApplications = filters.hasActiveApplication
    ? ownerFiltered.filter((contact) => contact.hasActiveApplication)
    : ownerFiltered;

  return delay(withApplications);
};

export const fetchCompanies = async () => {
  const { silo } = useCrmStore.getState();
  return delay(companies.filter((company) => company.silo === silo));
};

export const fetchTimeline = async (
  entityType: "contact" | "company",
  entityId: string
) => {
  return delay(
    timelineEvents
      .filter((event) => event.entityType === entityType && event.entityId === entityId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  );
};

export const createNote = async (entityId: string, summary: string) => {
  const note: TimelineEvent = {
    id: `note-${Date.now()}`,
    entityId,
    entityType: "contact",
    type: "note",
    occurredAt: new Date().toISOString(),
    summary
  };
  timelineEvents.push(note);
  return delay(note);
};

export const logCallEvent = async (payload: {
  contactId: string;
  number: string;
  durationSeconds: number;
  outcome: string;
  failureReason?: string | null;
}) => {
  const call: TimelineEvent = {
    id: `call-${Date.now()}`,
    entityId: payload.contactId,
    entityType: "contact",
    type: "call",
    direction: "outbound",
    occurredAt: new Date().toISOString(),
    summary: "Outbound call logged",
    details: `Number: ${payload.number} · Duration: ${payload.durationSeconds}s · Outcome: ${payload.outcome}${
      payload.failureReason ? ` · Reason: ${payload.failureReason}` : ""
    }`,
    call: {
      outcome: payload.outcome,
      durationSeconds: payload.durationSeconds,
      failureReason: payload.failureReason ?? null,
      recordingUrl: null
    }
  };
  timelineEvents.push(call);
  return delay(call);
};

export const fetchApplications = async (contactId: string) =>
  delay(crmApplications.filter((application) => application.contactId === contactId));

export const fetchContactCompanies = async (contact: Contact) =>
  delay(companies.filter((company) => contact.companyIds.includes(company.id)));

export const fetchCompanyContacts = async (company: Company) =>
  delay(contacts.filter((contact) => company.contactIds.includes(contact.id)));

export const createContact = async (payload: {
  name: string;
  email: string;
  phone: string;
  silo: Contact["silo"];
  owner: string;
  tags?: string[];
  referrerId?: string;
  referrerName?: string;
}) => {
  const contact: Contact = {
    id: `c-${Date.now()}`,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    silo: payload.silo,
    owner: payload.owner,
    tags: payload.tags ?? [],
    hasActiveApplication: false,
    companyIds: [],
    applicationIds: [],
    referrerId: payload.referrerId,
    referrerName: payload.referrerName
  };
  contacts.push(contact);
  return delay(contact);
};

export const createCompany = async (payload: {
  name: string;
  silo: Company["silo"];
  industry?: string;
  website?: string;
  owner: string;
  tags?: string[];
  referrerId?: string;
  referrerName?: string;
}) => {
  const company: Company = {
    id: `co-${Date.now()}`,
    name: payload.name,
    silo: payload.silo,
    industry: payload.industry ?? "Unspecified",
    website: payload.website,
    owner: payload.owner,
    tags: payload.tags ?? [],
    contactIds: [],
    referrerId: payload.referrerId,
    referrerName: payload.referrerName
  };
  companies.push(company);
  return delay(company);
};

export const linkContactCompany = async (contactId: string, companyId: string) => {
  const contact = contacts.find((item) => item.id === contactId);
  const company = companies.find((item) => item.id === companyId);
  if (!contact || !company) return delay(null);
  if (!contact.companyIds.includes(companyId)) contact.companyIds.push(companyId);
  if (!company.contactIds.includes(contactId)) company.contactIds.push(contactId);
  return delay({ contact, company });
};

export const createContactApplication = async (payload: {
  contactId: string;
  stage: string;
}) => {
  const application = {
    id: `app-${Date.now()}`,
    stage: payload.stage,
    contactId: payload.contactId
  };
  crmApplications.push(application);
  const contact = contacts.find((item) => item.id === payload.contactId);
  if (contact) {
    if (!contact.applicationIds.includes(application.id)) {
      contact.applicationIds.push(application.id);
      contact.hasActiveApplication = true;
    }
  }
  return delay(application);
};

export async function fetchLeads() {
  return api.get("/crm/leads");
}

export async function fetchLeadById(id: string) {
  return api.get(`/crm/leads/${id}`);
}

export async function fetchCreditReadinessLeads(): Promise<CRMLead[]> {
  return apiClient.get<CRMLead[]>("/api/crm/credit-readiness");
}

export async function convertReadinessToApplication(id: string) {
  return apiClient.post(`/api/crm/credit-readiness/${id}/convert`);
}

export async function fetchChatSessions() {
  const res = await api.get("/chat/sessions");
  return res.data;
}

export async function fetchContinuationLeads() {
  const res = await api.get("/api/application/continuations");
  return res.data;
}
