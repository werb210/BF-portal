// BF_CREDIT_SUMMARY_UI_v46 — calls the Block 45 server engine.
// New endpoints (BF-Server, no /v1/ prefix):
//   GET  /api/credit-summary/:applicationId
//   POST /api/credit-summary                                   { applicationId, sections }
//   POST /api/credit-summary/:applicationId/regenerate
//   POST /api/credit-summary/:applicationId/submit
import { api } from "@/api";

export interface ApplicationOverview {
  applicant_name: string | null;
  address: string | null;
  principals: string[];
  assets: string | null;
  transaction_type: string | null;
  loan_amount: number | null;
  term: string | null;
  industry: string | null;
  structure: string | null;
  owner: string | null;
  advance: number | null;
  ltv: number | null;
  website: string | null;
}

export interface FinancialTable {
  headers: string[];
  rows: { label: string; values: (number | null)[] }[];
}

export interface BankingMetrics {
  avg_balance: number | null;
  nsf_count: number | null;
  monthly_revenue: number | null;
  revenue_trend: "up" | "down" | null;
  documents_analyzed: number;
}

export type RecommendedAction = "approve" | "decline" | "needs_more_info" | "review";

export interface CreditSummarySections {
  application_overview: ApplicationOverview;
  transaction: { narrative: string };
  business_overview: { narrative: string };
  financial_overview: { narrative: string; table: FinancialTable };
  banking_analysis: { narrative: string; metrics: BankingMetrics };
  recommendation: { narrative: string; recommended_action: RecommendedAction };
}

export interface CreditSummaryRow {
  id: string;
  application_id: string;
  sections: CreditSummarySections;
  inputs_snapshot: Record<string, unknown>;
  ai_suggestions: Record<string, unknown>;
  version: number;
  is_locked: boolean;
  status: "draft" | "submitted" | "locked";
  generated_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditSummaryVersion {
  id: string;
  version: number;
  reason: string;
  created_by: string | null;
  created_at: string;
}

export interface FetchResponse {
  ok: true;
  credit_summary: CreditSummaryRow;
  versions: CreditSummaryVersion[];
}

export interface MutateResponse {
  ok: true;
  credit_summary: CreditSummaryRow;
}

export const fetchCreditSummary = (applicationId: string, options?: { signal?: AbortSignal }) =>
  api.get<FetchResponse>(`/api/credit-summary/${encodeURIComponent(applicationId)}`, options);

export const saveCreditSummary = (applicationId: string, sections: CreditSummarySections) =>
  api.post<MutateResponse>(`/api/credit-summary`, { applicationId, sections });

export const regenerateCreditSummary = (applicationId: string) =>
  api.post<MutateResponse>(`/api/credit-summary/${encodeURIComponent(applicationId)}/regenerate`);

export const submitCreditSummary = (applicationId: string) =>
  api.post<MutateResponse>(`/api/credit-summary/${encodeURIComponent(applicationId)}/submit`);
