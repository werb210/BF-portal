import type { Contact } from "./crm";

export type CommunicationType = "chat" | "human" | "issue" | "sms" | "system" | "credit_readiness" | "contact_form";
export type CommunicationDirection = "in" | "out";

export type CommunicationMessage = {
  id: string;
  conversationId: string;
  direction: CommunicationDirection;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  type: CommunicationType;
  silo: string;
};

export type SmsMessage = CommunicationMessage;

export type CommunicationConversation = {
  id: string;
  sessionId?: string;
  applicationId?: string;
  readinessToken?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  applicationName?: string;
  type: CommunicationType;
  direction?: CommunicationDirection;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  silo: string;
  assignedTo?: string;
  unread?: number;
  messages: CommunicationMessage[];
  highlighted?: boolean;
  acknowledged?: boolean;
  leadId?: string;
  status?: "ai" | "human" | "closed";
  closedAt?: string;
};

export type CrmLead = {
  id: string;
  name: string;
  fullName?: string;
  company?: string;
  contact?: string;
  industry?: string;
  yib?: string;
  revenue?: string;
  ar?: string;
  availableCollateral?: string;
  status?: string;
  email?: string;
  phone?: string;
  readinessToken?: string;
  readinessScore?: number;
  readinessAnswers?: Record<string, string>;
  readinessCapturedAt?: string;
  continueApplication?: boolean;
  tags: string[];
  conversationIds: string[];
  transcriptIds: string[];
};

export type TimelineEntry = {
  id: string;
  contactId?: string;
  applicationId?: string;
  conversationId: string;
  message: string;
  createdAt: string;
};

const crmTimeline: TimelineEntry[] = [];
const applicationTimeline: TimelineEntry[] = [];

const staffRotation = ["Alex", "Brooke", "Casey", "Devon"];
let rotationIndex = 0;

const now = () => new Date().toISOString();

const baseConversations: CommunicationConversation[] = [
  {
    id: "conv-chat-1",
    sessionId: "chat-session-1001",
    contactId: "contact-1",
    contactName: "Jane Client",
    contactEmail: "jane.client@example.com",
    contactPhone: "+1-555-0101",
    applicationId: "app-1001",
    applicationName: "BF Application 1001",
    type: "chat",
    createdAt: now(),
    updatedAt: now(),
    silo: "BF",
    assignedTo: "Alex",
    unread: 1,
    messages: [
      {
        id: "msg-1",
        conversationId: "conv-chat-1",
        direction: "in",
        message: "Hi, I have a question about my status",
        createdAt: now(),
        type: "chat",
        silo: "BF"
      },
      {
        id: "msg-2",
        conversationId: "conv-chat-1",
        direction: "out",
        message: "Happy to help!",
        createdAt: now(),
        type: "chat",
        silo: "BF"
      }
    ]
  },
  {
    id: "conv-sms-1",
    contactId: "contact-2",
    contactName: "Jordan SMS",
    applicationId: "app-2002",
    applicationName: "BI Application 2002",
    type: "sms",
    createdAt: now(),
    updatedAt: now(),
    silo: "BI",
    assignedTo: "Brooke",
    unread: 0,
    messages: [
      {
        id: "msg-3",
        conversationId: "conv-sms-1",
        direction: "in",
        message: "New documents submitted",
        createdAt: now(),
        type: "sms",
        silo: "BI"
      }
    ]
  },
  {
    id: "conv-human-1",
    sessionId: "chat-session-3003",
    contactId: "contact-3",
    contactName: "Taylor Escalation",
    contactEmail: "taylor@example.com",
    applicationId: "app-3003",
    applicationName: "SLF Application 3003",
    type: "human",
    createdAt: now(),
    updatedAt: now(),
    silo: "SLF",
    assignedTo: "Casey",
    highlighted: true,
    unread: 2,
    messages: [
      {
        id: "msg-4",
        conversationId: "conv-human-1",
        direction: "in",
        message: "Client requested human assistance via AI chat.",
        createdAt: now(),
        type: "human",
        silo: "SLF"
      }
    ]
  },
  {
    id: "conv-issue-1",
    sessionId: "issue-session-4004",
    contactId: "contact-4",
    contactName: "Jamie Issue",
    applicationId: "app-4004",
    applicationName: "BF Application 4004",
    type: "issue",
    createdAt: now(),
    updatedAt: now(),
    silo: "BF",
    assignedTo: "Devon",
    highlighted: true,
    acknowledged: false,
    unread: 1,
    messages: [
      {
        id: "msg-5",
        conversationId: "conv-issue-1",
        direction: "in",
        message: "Report: Upload button fails",
        createdAt: now(),
        type: "issue",
        silo: "BF"
      }
    ]
  },
  {
    id: "conv-readiness-1",
    sessionId: "readiness-session-1",
    readinessToken: "readiness-portal-001",
    contactName: "Nora Readiness",
    contactEmail: "nora@ventures.example",
    contactPhone: "+1-555-0404",
    applicationName: "Readiness Session",
    type: "credit_readiness",
    createdAt: now(),
    updatedAt: now(),
    silo: "BF",
    assignedTo: "Alex",
    unread: 0,
    metadata: {
      status: "in_review",
      progression: "readiness_only",
      companyName: "Nora Ventures LLC",
      fullName: "Nora Readiness",
      email: "nora@ventures.example",
      phone: "+1-555-0404",
      kyc: { legalName: "Nora Ventures LLC", taxId: "XX-1234567" },
      industry: "Technology",
      yib: "2",
      revenue: "$85,000/mo",
      ar: "$18,000",
      availableCollateral: "$12,000",
      readinessScore: 84,
      readinessAnswers: { creditHistory: "strong", timeInBusiness: "18 months", cashFlow: "stable" },
      readinessCapturedAt: now(),
      continueApplication: true
    },
    messages: [
      {
        id: "msg-readiness-1",
        conversationId: "conv-readiness-1",
        direction: "in",
        message: "Submitted credit readiness with KYC fields.",
        createdAt: now(),
        type: "credit_readiness",
        silo: "BF"
      }
    ]
  },
  {
    id: "conv-contact-form-1",
    contactName: "Wes Contact",
    applicationName: "Website Contact",
    type: "contact_form",
    createdAt: now(),
    updatedAt: now(),
    silo: "BI",
    assignedTo: "Brooke",
    unread: 1,
    messages: [
      {
        id: "msg-contact-1",
        conversationId: "conv-contact-form-1",
        direction: "in",
        message: "Contact form submission requesting callback.",
        createdAt: now(),
        type: "contact_form",
        silo: "BI"
      }
    ]
  }
];

let conversations = baseConversations.map((conv) => ({ ...conv }));
const leads: CrmLead[] = [];

const clone = <T,>(data: T): T => structuredClone(data);

const logTimeline = (conversation: CommunicationConversation, message: string) => {
  const entry: TimelineEntry = {
    id: `timeline-${Date.now()}`,
    conversationId: conversation.id,
    contactId: conversation.contactId,
    applicationId: conversation.applicationId,
    message,
    createdAt: now()
  };

  if (conversation.contactId) {
    crmTimeline.push(entry);
  }
  if (conversation.applicationId) {
    applicationTimeline.push(entry);
  }

  return entry;
};

export const logApplicationCallEvent = async (payload: {
  applicationId: string;
  number: string;
  durationSeconds: number;
  outcome: string;
  failureReason?: string | null;
}) => {
  const entry: TimelineEntry = {
    id: `call-${Date.now()}`,
    conversationId: payload.applicationId,
    applicationId: payload.applicationId,
    message: `Call to ${payload.number} · Duration ${payload.durationSeconds}s · Outcome ${payload.outcome}${
      payload.failureReason ? ` · Reason ${payload.failureReason}` : ""
    }`,
    createdAt: now()
  };
  applicationTimeline.push(entry);
  return Promise.resolve(clone(entry));
};

const findConversation = (conversationId: string) => conversations.find((conv) => conv.id === conversationId);

const updateConversation = (conversation: CommunicationConversation) => {
  conversations = conversations.map((existing) => (existing.id === conversation.id ? conversation : existing));
  return conversation;
};

const normalized = (value?: string) => value?.trim().toLowerCase() ?? "";

export const ensureCrmLead = (payload: {
  name?: string;
  fullName?: string;
  company?: string;
  industry?: string;
  yib?: string;
  revenue?: string;
  ar?: string;
  availableCollateral?: string;
  status?: string;
  email?: string;
  phone?: string;
  readinessToken?: string;
  readinessScore?: number;
  readinessAnswers?: Record<string, string>;
  readinessCapturedAt?: string;
  continueApplication?: boolean;
  tags?: string[];
  conversationId?: string;
}) => {
  const email = normalized(payload.email);
  const phone = normalized(payload.phone);
  const existing = leads.find((lead) => (email && normalized(lead.email) === email) || (phone && normalized(lead.phone) === phone));
  if (existing) {
    if (payload.readinessToken && !existing.readinessToken) {
      existing.readinessToken = payload.readinessToken;
    }
    if (payload.conversationId && !existing.conversationIds.includes(payload.conversationId)) {
      existing.conversationIds.push(payload.conversationId);
    }
    existing.company = existing.company ?? payload.company;
    existing.fullName = existing.fullName ?? payload.fullName;
    existing.contact = existing.contact ?? payload.name;
    existing.industry = existing.industry ?? payload.industry;
    existing.yib = existing.yib ?? payload.yib;
    existing.revenue = existing.revenue ?? payload.revenue;
    existing.ar = existing.ar ?? payload.ar;
    existing.availableCollateral = existing.availableCollateral ?? payload.availableCollateral;
    existing.status = existing.status ?? payload.status;
    existing.readinessScore = existing.readinessScore ?? payload.readinessScore;
    existing.readinessAnswers = existing.readinessAnswers ?? payload.readinessAnswers;
    existing.readinessCapturedAt = existing.readinessCapturedAt ?? payload.readinessCapturedAt;
    existing.continueApplication = existing.continueApplication ?? payload.continueApplication;
    payload.tags?.forEach((tag) => {
      if (!existing.tags.includes(tag)) existing.tags.push(tag);
    });
    return existing;
  }

  const created: CrmLead = {
    id: `lead-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: payload.name || "Unknown Lead",
    fullName: payload.fullName ?? payload.name,
    company: payload.company,
    contact: payload.name,
    industry: payload.industry,
    yib: payload.yib,
    revenue: payload.revenue,
    ar: payload.ar,
    availableCollateral: payload.availableCollateral,
    status: payload.status,
    email: payload.email,
    phone: payload.phone,
    readinessToken: payload.readinessToken,
    readinessScore: payload.readinessScore,
    readinessAnswers: payload.readinessAnswers,
    readinessCapturedAt: payload.readinessCapturedAt,
    continueApplication: payload.continueApplication,
    tags: payload.tags ?? [],
    conversationIds: payload.conversationId ? [payload.conversationId] : [],
    transcriptIds: []
  };
  leads.push(created);
  return created;
};

const ensureConversationLead = (conversation: CommunicationConversation) => {
  if (conversation.leadId) return conversation;
  const tags = conversation.type === "credit_readiness" ? ["readiness", "startup_interest"] : ["startup_interest", "confidence_check"];
  const lead = ensureCrmLead({
    name: conversation.contactName,
    fullName:
      typeof conversation.metadata?.fullName === "string" ? conversation.metadata.fullName : conversation.contactName,
    company: conversation.applicationName,
    industry: typeof conversation.metadata?.industry === "string" ? conversation.metadata.industry : "Unknown",
    yib: typeof conversation.metadata?.yib === "string" ? conversation.metadata.yib : undefined,
    revenue: typeof conversation.metadata?.revenue === "string" ? conversation.metadata.revenue : "Unknown",
    ar: typeof conversation.metadata?.ar === "string" ? conversation.metadata.ar : undefined,
    availableCollateral: typeof conversation.metadata?.availableCollateral === "string" ? conversation.metadata.availableCollateral : undefined,
    status: typeof conversation.metadata?.status === "string" ? conversation.metadata.status : "new",
    email: typeof conversation.metadata?.email === "string" ? conversation.metadata.email : conversation.contactEmail,
    phone: typeof conversation.metadata?.phone === "string" ? conversation.metadata.phone : conversation.contactPhone,
    readinessToken: conversation.readinessToken,
    readinessScore: typeof conversation.metadata?.readinessScore === "number" ? conversation.metadata.readinessScore : undefined,
    readinessAnswers:
      conversation.metadata?.readinessAnswers && typeof conversation.metadata.readinessAnswers === "object"
        ? (conversation.metadata.readinessAnswers as Record<string, string>)
        : undefined,
    readinessCapturedAt:
      typeof conversation.metadata?.readinessCapturedAt === "string" ? conversation.metadata.readinessCapturedAt : undefined,
    continueApplication:
      typeof conversation.metadata?.continueApplication === "boolean" ? conversation.metadata.continueApplication : undefined,
    tags,
    conversationId: conversation.id
  });
  const updated = { ...conversation, leadId: lead.id };
  updateConversation(updated);
  return updated;
};

export const fetchCommunicationThreads = async (businessUnit?: string) => {
  conversations.forEach((conversation) => ensureConversationLead(conversation));
  const scoped = businessUnit ? conversations.filter((conversation) => conversation.silo === businessUnit) : conversations;
  return Promise.resolve(clone(scoped));
};

export const fetchConversationById = async (conversationId: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  return clone(conversation);
};

export const sendCommunication = async (
  conversationId: string,
  body: string,
  channel?: CommunicationType,
  siloNumber?: string
) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const message: CommunicationMessage = {
    id: `msg-${Date.now()}`,
    conversationId,
    direction: "out",
    message: channel === "sms" && siloNumber ? `${body} (from ${siloNumber})` : body,
    createdAt: now(),
    type: channel ?? conversation.type,
    silo: conversation.silo
  };

  const updated: CommunicationConversation = {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: message.createdAt,
    unread: 0
  };

  updateConversation(updated);
  logTimeline(updated, `Staff replied via ${message.type}: ${body}`);
  return clone(message);
};

export const receiveInboundMessage = async (
  conversationId: string,
  body: string,
  type: CommunicationType,
  silo: string
) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const message: CommunicationMessage = {
    id: `msg-${Date.now()}`,
    conversationId,
    direction: "in",
    message: body,
    createdAt: now(),
    type,
    silo
  };
  const updated: CommunicationConversation = {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: message.createdAt,
    unread: (conversation.unread ?? 0) + 1
  };
  updateConversation(updated);
  logTimeline(updated, `Inbound ${type} message received: ${body}`);
  return clone(message);
};

export const createHumanEscalation = async (payload: {
  contactId?: string;
  contactName?: string;
  applicationId?: string;
  applicationName?: string;
  silo: string;
  message: string;
}) => {
  const assignedTo = staffRotation[rotationIndex % staffRotation.length];
  rotationIndex += 1;
  const conversationId = `human-${Date.now()}`;
  const conversation: CommunicationConversation = {
    id: conversationId,
    sessionId: conversationId,
    contactId: payload.contactId,
    contactName: payload.contactName,
    applicationId: payload.applicationId,
    applicationName: payload.applicationName,
    type: "human",
    createdAt: now(),
    updatedAt: now(),
    silo: payload.silo,
    assignedTo,
    highlighted: true,
    unread: 1,
    status: "human",
    messages: [
      {
        id: `msg-${Date.now()}`,
        conversationId,
        direction: "in",
        message: payload.message,
        createdAt: now(),
        type: "human",
        silo: payload.silo
      }
    ]
  };
  const linked = ensureConversationLead(conversation);
  conversations = [linked, ...conversations];
  logTimeline(linked, "Client requested human assistance via AI chat.");
  return clone(linked);
};

export const createIssueReport = async (payload: {
  contactId?: string;
  contactName?: string;
  applicationId?: string;
  applicationName?: string;
  silo: string;
  message: string;
  screenshot?: string;
  context?: "client" | "website";
}) => {
  const conversationId = `issue-${Date.now()}`;
  const conversation: CommunicationConversation = {
    id: conversationId,
    sessionId: conversationId,
    contactId: payload.contactId,
    contactName: payload.contactName,
    applicationId: payload.applicationId,
    applicationName: payload.applicationName,
    type: "issue",
    createdAt: now(),
    updatedAt: now(),
    silo: payload.silo,
    assignedTo: "Unassigned",
    highlighted: true,
    acknowledged: false,
    unread: 1,
    messages: [
      {
        id: `msg-${Date.now()}`,
        conversationId,
        direction: "in",
        message: payload.message,
        createdAt: now(),
        type: "issue",
        silo: payload.silo
      }
    ],
    metadata: {
      screenshot: payload.screenshot,
      context: payload.context ?? "website",
      timestamp: now()
    }
  };
  const linked = ensureConversationLead(conversation);
  conversations = [linked, ...conversations];
  logTimeline(linked, "Issue reported via AI workflow.");
  return clone(linked);
};

export const acknowledgeIssue = async (conversationId: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const updated = { ...conversation, acknowledged: true, highlighted: false, unread: 0 };
  updateConversation(updated);
  logTimeline(updated, "Issue acknowledged by staff.");
  return clone(updated);
};

export const deleteIssue = async (conversationId: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation || conversation.type !== "issue") {
    throw new Error("Issue not found");
  }
  if (conversation.status !== "closed") {
    throw new Error("Issue must be resolved before deletion");
  }
  conversations = conversations.filter((item) => item.id !== conversationId);
  return Promise.resolve({ success: true });
};

export const attachTranscriptToLead = async (conversationId: string, transcript: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const linkedConversation = ensureConversationLead(conversation);
  const lead = leads.find((item) => item.id === linkedConversation.leadId);
  if (!lead) throw new Error("Lead not found");
  lead.transcriptIds.push(`transcript-${Date.now()}`);
  logTimeline(linkedConversation, `Chat transcript attached to CRM lead: ${transcript.slice(0, 60)}`);
  return clone(lead);
};

export const closeEscalatedChat = async (conversationId: string, transcript: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  await attachTranscriptToLead(conversationId, transcript);
  const updated: CommunicationConversation = {
    ...conversation,
    status: "closed",
    closedAt: now(),
    highlighted: false,
    unread: 0,
    updatedAt: now()
  };

  updateConversation(updated);
  logTimeline(updated, "Escalated chat closed by staff.");
  return clone(updated);
};

export const archiveIssue = async (conversationId: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const archived = {
    ...conversation,
    highlighted: false,
    unread: 0,
    metadata: {
      ...conversation.metadata,
      archived: true,
      archivedAt: now()
    },
    updatedAt: now()
  };
  updateConversation(archived);
  logTimeline(archived, "Issue archived by staff.");
  return clone(archived);
};

export const applyHumanActiveState = async (conversationId: string) => {
  const conversation = findConversation(conversationId);
  if (!conversation) throw new Error("Conversation not found");
  const updated: CommunicationConversation = {
    ...conversation,
    status: "human",
    updatedAt: now(),
    metadata: {
      ...conversation.metadata,
      aiPaused: true,
      aiPausedAt: now()
    }
  };
  updateConversation(updated);
  return clone(updated);
};

export const fetchCrmLeads = async () => Promise.resolve(clone(leads));

export const fetchSmsThread = async (contactId: string) => {
  const thread = conversations.find((conv) => conv.contactId === contactId && conv.type === "sms");
  return Promise.resolve(thread ? clone(thread.messages) : []);
};

export const sendSms = async (contact: Contact, body: string, siloNumber: string) => {
  let conversation = conversations.find((conv) => conv.contactId === contact.id && conv.type === "sms");
  if (!conversation) {
    const applicationId = contact.applicationIds[0];
    conversation = {
      id: `sms-${Date.now()}`,
      contactId: contact.id,
      contactName: contact.name,
      applicationId,
      applicationName: applicationId ? `Application ${applicationId}` : undefined,
      type: "sms",
      createdAt: now(),
      updatedAt: now(),
      silo: contact.silo ?? "BF",
      messages: [],
      unread: 0
    };
    conversations = [conversation, ...conversations];
  }
  const message = await sendCommunication(conversation.id, body, "sms", siloNumber);
  return message;
};

export const logCall = async (contactId: string, summary: string) =>
  new Promise((resolve) => setTimeout(() => resolve({ contactId, summary }), 10));

export const getCrmTimelineEntries = (contactId: string) => crmTimeline.filter((entry) => entry.contactId === contactId);

export const getApplicationTimelineEntries = (applicationId: string) =>
  applicationTimeline.filter((entry) => entry.applicationId === applicationId);

export const resetCommunicationsFixtures = () => {
  conversations = baseConversations.map((conv) => ({ ...conv, messages: [...conv.messages] }));
  crmTimeline.length = 0;
  applicationTimeline.length = 0;
  rotationIndex = 0;
  leads.length = 0;
};
