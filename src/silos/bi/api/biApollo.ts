// BF_PORTAL_BLOCK_v125_BI_LENDER_APOLLO_PHASE1_v1
// Typed API client for BI-Server v220 Apollo read-side proxies.
// Path /api/v1/bi/apollo/* resolves to BI-Server via BF_SILO_API_ROUTING_v43.
import { api } from "@/api";

export type ApolloSequence = {
  id: string;
  name?: string;
  active?: boolean;
  archived?: boolean;
  num_steps?: number;
  num_active_contacts?: number;
  num_completed_contacts?: number;
  created_at?: string;
  updated_at?: string;
};

export type ApolloEmailAccount = {
  id: string;
  email?: string;
  status?: string;
  send_limit_per_day?: number;
  emails_sent_today?: number;
  bounce_rate?: number;
  reply_rate?: number;
};

export type ApolloReply = {
  id: string;
  from_email?: string;
  to_email?: string;
  subject?: string;
  body_preview?: string;
  replied_at?: string;
  sequence_name?: string;
};

export type Pagination = {
  page: number; per_page: number; total_entries: number; total_pages: number;
};

export async function listSequences(opts: { page?: number; per_page?: number } = {}) {
  const page = opts.page ?? 1;
  const per_page = opts.per_page ?? 50;
  return api.get<{ sequences: ApolloSequence[]; pagination: Pagination }>(
    `/api/v1/bi/apollo/sequences?page=${page}&per_page=${per_page}`,
  );
}

export async function listEmailAccounts() {
  return api.get<{ email_accounts: ApolloEmailAccount[] }>(
    "/api/v1/bi/apollo/email-accounts",
  );
}

export async function listReplies(opts: { page?: number; per_page?: number; date_range_min?: string } = {}) {
  const page = opts.page ?? 1;
  const per_page = opts.per_page ?? 50;
  const dmin = opts.date_range_min ? `&date_range_min=${encodeURIComponent(opts.date_range_min)}` : "";
  return api.get<{ replies: ApolloReply[]; pagination: Pagination }>(
    `/api/v1/bi/apollo/replies?page=${page}&per_page=${per_page}${dmin}`,
  );
}
