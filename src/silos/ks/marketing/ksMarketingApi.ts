// BF_PORTAL_v865_KS_MARKETING - Keystone marketing to prospective licensees. Every call goes to KS-Ops
// (/api/ops/marketing/*) through ksRequest, like the rest of the Keystone operations screens; never BF-Server.
import { ksRequest } from "../ksApi";

export const KS_PROSPECT_STATUSES = ["lead", "demo_booked", "trial", "customer", "lost"] as const;
export const KS_PROSPECT_SOURCES = ["demo_signup", "beta_signup", "assistant", "website_signup", "licensee", "crm", "import", "manual"] as const;
export const KS_PLAN_INTEREST = ["starter", "growth", "pro"] as const;
export const KS_CONSENT_TYPES = ["none", "express", "implied_inquiry", "implied_business", "implied_publication", "us_opt_out"] as const;

export const STATUS_LABELS: Record<string, string> = {
  lead: "Lead", demo_booked: "Demo booked", trial: "Trial", customer: "Customer", lost: "Lost",
};
export const SOURCE_LABELS: Record<string, string> = {
  demo_signup: "Demo sign-up", beta_signup: "Beta sign-up", assistant: "Website assistant (Maya)", website_signup: "Website sign-up",
  licensee: "Licensee (staff)", crm: "Keystone CRM", import: "Import", manual: "Added by staff",
};
export const CONSENT_LABELS: Record<string, string> = {
  none: "No consent recorded",
  express: "Express consent",
  implied_inquiry: "Implied - inquiry (6 months)",
  implied_business: "Implied - existing customer (2 years after it ends)",
  implied_publication: "Implied - published business email (12-month review)",
  us_opt_out: "US business contact (CAN-SPAM opt-out)",
};
export const BLOCK_LABELS: Record<string, string> = {
  invalid_email: "Invalid email",
  suppressed_unsubscribed: "Unsubscribed",
  suppressed_hard_bounce: "Hard bounce",
  suppressed_spam_report: "Spam report",
  suppressed_crm_opt_out: "Opted out in the CRM",
  suppressed_manual: "Suppressed by staff",
  no_consent: "No consent",
  consent_expired: "Consent expired",
  consent_missing_date: "Consent date missing",
  us_opt_out_not_us: "CAN-SPAM basis but not in the US",
  prospect_deleted: "Prospect deleted",
};

export type SegmentFilters = { statuses?: string[]; sources?: string[]; plans?: string[]; countries?: string[]; regions?: string[]; q?: string };
export type Eligibility = { ok: true } | { ok: false; reason: string; message: string };

export type Prospect = {
  id: string; email: string; name: string | null; company: string | null; phone: string | null; title: string | null;
  country: string | null; province_state: string | null; status: string; source: string; sources: string[]; plan_interest: string | null;
  consent_type: string; consent_source: string | null; consent_text: string | null; consent_at: string | null; consent_expires_at: string | null;
  consent_recorded_by: string | null; demo_booked_at: string | null; signed_up_at: string | null; last_replied_at: string | null;
  last_emailed_at: string | null; created_at: string; updated_at: string; suppressed: string | null; eligibility?: Eligibility;
};

export type ProspectEvent = { id: string; type: string; summary: string; at: string };
export type ProspectSend = {
  id: string; subject: string | null; status: string; block_reason: string | null; sent_at: string | null; opened_at: string | null;
  clicked_at: string | null; bounced_at: string | null; campaign_name: string | null; sequence_name: string | null; step_index: number | null; created_at: string;
};
export type Enrollment = {
  id: string; status: string; next_step: number; next_send_at: string | null; stopped_reason: string | null; enrolled_at: string;
  finished_at: string | null; sequence_name?: string; sequence_id?: string; email?: string; name?: string | null; company?: string | null;
};

export type TemplateFields = { preheader: string; headline: string; body: string; cta_label: string; cta_url: string; body2: string; signature: string };
export const EMPTY_FIELDS: TemplateFields = { preheader: "", headline: "", body: "", cta_label: "", cta_url: "", body2: "", signature: "" };
export type Template = { id: string; name: string; subject: string; fields: Partial<TemplateFields>; archived: boolean; updated_at: string };

export type Campaign = {
  id: string; name: string; subject: string; status: string; send_at: string | null; started_at: string | null; finished_at: string | null;
  template_id?: string | null; fields?: Partial<TemplateFields>; filters: SegmentFilters; created_by: string | null; created_at: string;
  sent?: number; blocked?: number; opened?: number; clicked?: number;
};
export type CampaignStats = {
  queued: number; sent: number; blocked: number; failed: number; delivered: number; opened: number; clicked: number; bounced: number;
  spam: number; unsubscribed: number; blocked_by_reason: Record<string, number>;
};
export type Recipient = {
  id: string; email: string; status: string; block_reason: string | null; error: string | null; sent_at: string | null; opened_at: string | null;
  clicked_at: string | null; bounced_at: string | null; unsubscribed_at: string | null; name: string | null; company: string | null; prospect_id: string;
};
export type SequenceStep = { wait_days: number; template_id: string };
export type Sequence = { id: string; name: string; status: string; steps: SequenceStep[]; active?: number; enrolled?: number; updated_at: string };
export type Suppression = { email: string; reason: string; source: string | null; note: string | null; created_by: string | null; created_at: string };

export type MarketingStatus = {
  can_send: boolean;
  sending_problem: string | null;
  sender: { from: string; from_name: string; from_configured: boolean; reply_to: string; business_name: string; legal_name: string; address: string; address_is_default: boolean };
  domain: { domain: string; authenticated: boolean | null; error: string | null; checked_at: string };
  tracking_configured: boolean;
  reply_detection: { mailbox: string | null };
  public_url: string;
  warnings: string[];
};

export type ConsentInput = { consent_type: string; consent_source?: string; consent_text?: string; consent_at?: string; consent_expires_at?: string | null };

const enc = encodeURIComponent;
const csv = (v?: string[]) => (v && v.length ? v.join(",") : undefined);

export const mktApi = {
  status: (refresh = false) => ksRequest<MarketingStatus>("/api/ops/marketing/status", { params: { refresh: refresh ? 1 : undefined } }),

  prospects: (f: SegmentFilters & { eligible?: "yes" | "no" | ""; limit?: number; offset?: number } = {}) =>
    ksRequest<{ prospects: Prospect[]; total: number }>("/api/ops/marketing/prospects", {
      params: {
        statuses: csv(f.statuses), sources: csv(f.sources), plans: csv(f.plans), countries: csv(f.countries), regions: csv(f.regions),
        q: f.q, eligible: f.eligible, limit: f.limit, offset: f.offset,
      },
    }),
  prospect: (id: string) =>
    ksRequest<{ prospect: Prospect; eligibility: Eligibility; events: ProspectEvent[]; sends: ProspectSend[]; enrollments: Enrollment[] }>(`/api/ops/marketing/prospects/${enc(id)}`),
  addProspect: (body: Record<string, unknown>) => ksRequest<{ prospect: Prospect }>("/api/ops/marketing/prospects", { method: "POST", body }),
  importProspects: (rows: Array<Record<string, string>>, consent: ConsentInput | null) =>
    ksRequest<{ added: number; updated: number; skipped: Array<{ row: number; email: string; error: string }> }>("/api/ops/marketing/prospects/import", {
      method: "POST",
      body: { rows, ...(consent ? { consent } : {}) },
    }),
  updateProspect: (id: string, body: Record<string, unknown>) =>
    ksRequest<{ prospect: Prospect; eligibility: Eligibility }>(`/api/ops/marketing/prospects/${enc(id)}`, { method: "PATCH", body }),
  markReplied: (id: string) => ksRequest<{ ok: boolean; stopped: number }>(`/api/ops/marketing/prospects/${enc(id)}/replied`, { method: "POST", body: {} }),
  audience: (filters: SegmentFilters) =>
    ksRequest<{ total: number; eligible: number; blocked: Record<string, number> }>("/api/ops/marketing/audience", { method: "POST", body: { filters } }),

  templates: () => ksRequest<{ templates: Template[] }>("/api/ops/marketing/templates"),
  createTemplate: (body: { name: string; subject: string; fields: TemplateFields }) =>
    ksRequest<{ template: Template }>("/api/ops/marketing/templates", { method: "POST", body }),
  updateTemplate: (id: string, body: { name: string; subject: string; fields: TemplateFields }) =>
    ksRequest<{ template: Template }>(`/api/ops/marketing/templates/${enc(id)}`, { method: "PATCH", body }),
  archiveTemplate: (id: string, archived = true) =>
    ksRequest<{ template: Template }>(`/api/ops/marketing/templates/${enc(id)}/archive`, { method: "POST", body: { archived } }),
  preview: (subject: string, fields: TemplateFields) =>
    ksRequest<{ subject: string; html: string; text: string }>("/api/ops/marketing/preview", { method: "POST", body: { subject, fields } }),
  testSend: (subject: string, fields: TemplateFields, to: string[]) =>
    ksRequest<{ sent: string[]; failed: Array<{ email: string; error: string }> }>("/api/ops/marketing/test", { method: "POST", body: { subject, fields, to } }),

  campaigns: () => ksRequest<{ campaigns: Campaign[] }>("/api/ops/marketing/campaigns"),
  campaign: (id: string) => ksRequest<{ campaign: Campaign; stats: CampaignStats; recipients: Recipient[] }>(`/api/ops/marketing/campaigns/${enc(id)}`),
  createCampaign: (body: Record<string, unknown>) => ksRequest<{ campaign: Campaign }>("/api/ops/marketing/campaigns", { method: "POST", body }),
  updateCampaign: (id: string, body: Record<string, unknown>) =>
    ksRequest<{ campaign: Campaign }>(`/api/ops/marketing/campaigns/${enc(id)}`, { method: "PATCH", body }),
  sendCampaign: (id: string, sendAt: string | null) =>
    ksRequest<{ ok: true; queued: number; blocked: Record<string, number>; send_at: string }>(`/api/ops/marketing/campaigns/${enc(id)}/send`, {
      method: "POST",
      body: sendAt ? { send_at: sendAt } : {},
    }),
  cancelCampaign: (id: string) => ksRequest<{ ok: true; not_sent: number }>(`/api/ops/marketing/campaigns/${enc(id)}/cancel`, { method: "POST", body: {} }),

  sequences: () => ksRequest<{ sequences: Sequence[] }>("/api/ops/marketing/sequences"),
  sequence: (id: string) => ksRequest<{ sequence: Sequence; enrollments: Enrollment[] }>(`/api/ops/marketing/sequences/${enc(id)}`),
  createSequence: (body: { name: string; steps: SequenceStep[] }) => ksRequest<{ sequence: Sequence }>("/api/ops/marketing/sequences", { method: "POST", body }),
  updateSequence: (id: string, body: Partial<{ name: string; steps: SequenceStep[]; status: string }>) =>
    ksRequest<{ sequence: Sequence }>(`/api/ops/marketing/sequences/${enc(id)}`, { method: "PATCH", body }),
  enroll: (id: string, filters: SegmentFilters) =>
    ksRequest<{ ok: true; enrolled: number; already: number; blocked: Record<string, number> }>(`/api/ops/marketing/sequences/${enc(id)}/enroll`, {
      method: "POST",
      body: { filters },
    }),
  stopEnrollment: (id: string) => ksRequest<{ ok: true }>(`/api/ops/marketing/enrollments/${enc(id)}/stop`, { method: "POST", body: {} }),

  suppressions: (q = "") => ksRequest<{ suppressions: Suppression[] }>("/api/ops/marketing/suppressions", { params: { q } }),
  suppress: (email: string, note: string) => ksRequest<{ ok: true; added: boolean }>("/api/ops/marketing/suppressions", { method: "POST", body: { email, note } }),
  unsuppress: (email: string) => ksRequest<{ ok: true }>("/api/ops/marketing/suppressions/remove", { method: "POST", body: { email } }),
};

/** "Unsubscribed: 3, No consent: 2" */
export function blockedSummary(blocked: Record<string, number> | undefined): string {
  const parts = Object.entries(blocked ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${BLOCK_LABELS[k] ?? k}: ${n}`);
  return parts.length ? parts.join(", ") : "none";
}
