// BF_PORTAL_v945_KS_OUTREACH - Keystone silo > Marketing: brokerages, the channel scoreboard, the owner call list and
// referrals. Every call goes to KS-Ops (/api/ops/outreach/*) through ksRequest, like the rest of Keystone marketing.
import { ksRequest } from "../../ksApi";

export const QUALIFICATION_LABELS: Record<string, string> = { keep: "Keep", research: "Research", review: "Review", remove: "Removed" };
export const QUALIFICATION_HELP: Record<string, string> = {
  keep: "Verified brokerages with a decision-maker on file.",
  research: "Looks like a brokerage, but no decision-maker is known yet.",
  review: "Hybrid lender and broker, or unclear roles: someone has to decide.",
  remove: "Not a brokerage. Kept here so a later import cannot add them again.",
};
export const OUTCOME_LABELS: Record<string, string> = {
  sent: "Sent / done", no_answer: "No answer", voicemail: "Left a voicemail", reply: "They replied", conversation: "Spoke with someone",
  owner_conversation: "Owner conversation booked or held", demo: "Demo given", signup: "Signed up", not_interested: "Not interested",
  do_not_contact: "Asked not to be contacted", click: "Opened a tracked link",
};
export const ITEM_KIND_LABELS: Record<string, string> = {
  event: "Event", community: "Community or group", podcast: "Podcast", webinar: "Webinar", ad_campaign: "Ad campaign", directory: "Directory listing",
  video: "Video", partner: "Partner", landing_page: "Website page", mail_batch: "Mail batch", other: "Other",
};
/** The kind of thing each channel is made of, used to pre-fill "Add". */
export const CHANNEL_ITEM_KIND: Record<string, string> = {
  mail: "mail_batch", events: "event", communities: "community", podcasts_webinars: "podcast", search: "landing_page", paid_ads: "ad_campaign",
  directories: "directory", videos: "video", partners: "partner",
};

export type Brokerage = {
  id: string; name: string; website: string | null; domain: string | null; country: string | null; province_state: string | null; city: string | null;
  address_line1: string | null; address_line2: string | null; postal_code: string | null; employee_count: number | null; seats_estimate: number | null;
  current_tools: string[]; products: string | null; firm_type: string | null; qualification: string; qualification_reason: string | null;
  qualification_locked: boolean; status: string; assigned_to: string | null; fit_score: number; fit_reasons: string[]; notes: string | null;
  last_touch_at: string | null; people?: number; owners?: number; touches?: number;
};
export type Person = {
  id: string; name: string; title: string | null; email: string | null; direct_phone: string | null; mobile_phone: string | null; direct_dnc: boolean;
  mobile_dnc: boolean; is_owner: boolean; needs_review: boolean; verification_url: string | null; prospect_id: string | null; rank: number;
};
export type Touch = { id: string; channel_key: string; direction: string; outcome: string; summary: string | null; cost_cents: number; at: string; created_by: string | null; person_name: string | null; item_name: string | null };
export type TrackedLink = { code: string; channel_key: string; target_url: string; label: string | null; clicks: number; last_click_at: string | null };
export type Channel = {
  key: string; name: string; active: boolean; test_started_on: string | null; test_weeks: number; budget_cents: number; decision: string; notes: string | null;
  touches: number; firms: number; replies: number; conversations: number; owner_conversations: number; demos: number; signups: number; clicks: number;
  cost_cents: number; items: number; test_ends_on: string | null; test_days_left: number | null; cost_per_owner_conversation_cents: number | null; over_budget: boolean;
};
export type Item = { id: string; channel_key: string; kind: string; name: string; url: string | null; happens_on: string | null; cost_cents: number; status: string; notes: string | null; touches: number; wins: number; clicks: number };
export type Call = { person_id: string; name: string; title: string | null; is_owner: boolean; direct_phone: string | null; mobile_phone: string | null; brokerage_id: string; brokerage: string; country: string | null; province_state: string | null; fit_score: number; current_tools: string[]; calls: number };
export type Referral = { id: string; referrer_name: string; code: string; referred_name: string | null; referred_brokerage: string | null; status: string; reward: string | null; reward_cents: number; reward_applied_at: string | null; notes: string | null; created_at: string };
export type ImportResult = { rows: number; brokerages_added: number; brokerages_updated: number; people_added: number; people_updated: number; prospects_linked: number; excluded: number; skipped: Array<{ row: number; error: string }> };
export type FirmType = { key: string; label: string };

const enc = encodeURIComponent;
const B = "/api/ops/outreach";
export const outreachApi = {
  meta: () => ksRequest<{ firm_types: FirmType[]; max_import: number }>(`${B}/meta`),
  brokerages: (f: { qualification?: string; q?: string; countries?: string; has?: string; limit?: number; offset?: number }) =>
    ksRequest<{ brokerages: Brokerage[]; total: number; counts: Record<string, number> }>(`${B}/brokerages`, { params: f }),
  brokerage: (id: string) => ksRequest<{ brokerage: Brokerage; people: Person[]; touches: Touch[]; links: TrackedLink[] }>(`${B}/brokerages/${enc(id)}`),
  saveBrokerage: (id: string, body: Record<string, unknown>) => ksRequest<{ brokerage: Brokerage }>(`${B}/brokerages/${enc(id)}`, { method: "PATCH", body }),
  savePerson: (id: string, body: Record<string, unknown>) => ksRequest(`${B}/people/${enc(id)}`, { method: "PATCH", body }),
  importRows: (rows: Array<Record<string, unknown>>, consent: Record<string, unknown> | null) => ksRequest<ImportResult>(`${B}/import`, { method: "POST", body: { rows, consent } }),
  callList: (limit = 25) => ksRequest<{ calls: Call[] }>(`${B}/call-list`, { params: { limit } }),
  addTouch: (body: Record<string, unknown>) => ksRequest<{ id: string }>(`${B}/touches`, { method: "POST", body }),
  channels: () => ksRequest<{ channels: Channel[] }>(`${B}/channels`),
  saveChannel: (key: string, body: Record<string, unknown>) => ksRequest<{ channels: Channel[] }>(`${B}/channels/${enc(key)}`, { method: "PATCH", body }),
  items: (channel?: string) => ksRequest<{ items: Item[] }>(`${B}/items`, { params: { channel } }),
  addItem: (body: Record<string, unknown>) => ksRequest<{ item: Item }>(`${B}/items`, { method: "POST", body }),
  saveItem: (id: string, body: Record<string, unknown>) => ksRequest<{ item: Item }>(`${B}/items/${enc(id)}`, { method: "PATCH", body }),
  addLink: (body: Record<string, unknown>) => ksRequest<{ link: TrackedLink; url: string }>(`${B}/links`, { method: "POST", body }),
  referrals: () => ksRequest<{ referrals: Referral[]; owed_cents: number }>(`${B}/referrals`),
  addReferral: (body: Record<string, unknown>) => ksRequest<{ referral: Referral }>(`${B}/referrals`, { method: "POST", body }),
  saveReferral: (id: string, body: Record<string, unknown>) => ksRequest<{ referral: Referral }>(`${B}/referrals/${enc(id)}`, { method: "PATCH", body }),
};

export const dollarsToCents = (v: string): number => { const n = Number(String(v).replace(/[$,\s]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0; };
