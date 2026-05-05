import { api } from "@/api";

export type EngagementEventType =
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "email_bounced";

export type EngagementEvent = {
  id: string;
  event_type: EngagementEventType;
  sequence_name: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export type ApolloContactPayload = {
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    apollo_contact_id: string | null;
    apollo_data: {
      organization?: {
        name?: string;
        industry?: string;
        estimated_num_employees?: number;
        linkedin_url?: string;
        website_url?: string;
      };
      title?: string;
      seniority?: string;
      linkedin_url?: string;
    } | null;
    apollo_stage: string | null;
    apollo_sequence_names: string[];
    apollo_last_synced_at: string | null;
  };
  events: EngagementEvent[];
};

// BF_PORTAL_BLOCK_v124b_PORTAL_NETWORK_FIXES_v1
// BI-Server does not yet implement the Apollo marketing/enrich
// endpoints. Until it does, swallow 404/400 and return null so the UI
// doesn't surface red console errors that look like real failures.
// Real failures (5xx, network) still propagate.
async function quietFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404 || status === 400) return null;
    throw err;
  }
}

export async function fetchContactMarketing(contactId: string): Promise<ApolloContactPayload | null> {
  return quietFetch(() => api.get<ApolloContactPayload>(`/api/v1/bi/contacts/${contactId}/marketing`));
}

export async function triggerEnrichment(contactId: string, force = false): Promise<{ cached: boolean; apollo_data: unknown } | null> {
  return quietFetch(() => api.post(`/api/v1/bi/contacts/${contactId}/enrich${force ? "?force=1" : ""}`));
}
