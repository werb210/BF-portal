import api from "@/api/client";

export type ReadinessLeadStatus = "new" | "qualified" | "converted" | "archived" | string;

export interface ReadinessLead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  industry: string;
  yearsInBusiness: string | null;
  annualRevenue: string | null;
  monthlyRevenue: string | null;
  accountsReceivable: string | null;
  status: ReadinessLeadStatus;
  source?: string;
  tags: string[];
  availableCollateral: string | null;
  createdAt: string;
  transcriptHistory: string[];
  activityLog: string[];
}

export interface ReadinessConvertResponse {
  applicationId: string;
}

export interface ApplicationReadinessPayload {
  lead: ReadinessLead | null;
  transcriptHistory: string[];
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

const asDisplayValue = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const parseLead = (value: unknown): ReadinessLead | null => {
  const record = asRecord(value);
  if (!record || typeof record.id !== "string") return null;

  return {
    id: record.id,
    companyName: typeof record.companyName === "string" ? record.companyName : "",
    contactName: typeof record.contactName === "string" ? record.contactName : "",
    phone: typeof record.phone === "string" ? record.phone : "",
    email: typeof record.email === "string" ? record.email : "",
    industry: typeof record.industry === "string" ? record.industry : "",
    yearsInBusiness: asDisplayValue(record.yearsInBusiness),
    annualRevenue: asDisplayValue(record.annualRevenue),
    monthlyRevenue: asDisplayValue(record.monthlyRevenue),
    accountsReceivable: asDisplayValue(record.accountsReceivable ?? record.arBalance ?? record.ar),
    status: typeof record.status === "string" ? record.status : "new",
    source: typeof record.source === "string" ? record.source : "readiness",
    tags: asStringArray(record.tags ?? ["readiness", "startup_interest"]),
    availableCollateral: asDisplayValue(record.availableCollateral ?? record.collateral),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date(0).toISOString(),
    transcriptHistory: asStringArray(record.transcriptHistory),
    activityLog: asStringArray(record.activityLog)
  };
};

export async function fetchReadinessLeads(): Promise<ReadinessLead[]> {
  const res = await api.get("/portal/readiness-leads");
  if (!Array.isArray(res)) return [];
  return res.map(parseLead).filter((lead): lead is ReadinessLead => lead !== null);
}

export async function convertReadinessLeadToApplication(leadId: string): Promise<ReadinessConvertResponse> {
  const res = await api.post(`/portal/readiness-leads/${leadId}/convert`);
  const applicationId = asRecord(res)?.applicationId;
  if (typeof applicationId !== "string" || applicationId.length === 0) {
    throw new Error("Convert response missing applicationId");
  }
  return { applicationId };
}

export async function fetchApplicationReadiness(
  applicationId: string,
  options: { signal?: AbortSignal } = {}
): Promise<ApplicationReadinessPayload> {
  const res = await api.get(`/applications/${applicationId}/readiness`, options);
  const payload = asRecord(res);
  if (!payload) {
    return { lead: null, transcriptHistory: [] };
  }

  return {
    lead: parseLead(payload.lead),
    transcriptHistory: asStringArray(payload.transcriptHistory)
  };
}
