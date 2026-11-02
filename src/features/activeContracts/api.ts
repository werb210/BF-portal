// BF_PORTAL_v864_ACTIVE_CONTRACTS - BF-Server /api/active-contracts.
import { api, rawApiFetch } from "@/api";

export type BalanceView = { balance: number | null; percent_paid: number | null; basis: "reported" | "estimated" | "unknown"; source: string; as_of: string | null; total_repayable: number | null };
export type Renewal = { eligibility: "not_renewable" | "manual" | "not_yet" | "upcoming" | "eligible"; eligible_on: string | null; days_to_maturity: number | null; maturity_milestone: string | null };
export type Contract = {
  id: string; silo: string; company_id: string | null; contact_id: string | null; application_id: string | null;
  lender_id: string | null; lender_product_id: string | null; lender_name: string | null; product_name: string | null;
  product_category: string | null; facility_type: string | null; owner_user_id: string | null; owner_name: string | null;
  company_name: string | null; contact_name: string | null; original_amount: number | null; currency: string;
  funded_at: string | null; term_months: number | null; maturity_date: string | null; interest_rate: number | null;
  factor_rate: number | null; payment_amount: number | null; payment_frequency: string | null; status: string;
  status_label: string; is_history: boolean; outcome_required: boolean; renewal_eligible_on: string | null;
  manual_renewal_eligible: boolean; residual_amount: number | null; buyout_option: string | null; buyout_price: number | null;
  end_of_term_date: string | null; commission_model: string | null; commission_terms: Record<string, unknown>;
  internal_notes: string | null; previous_contract_id: string | null; renewal_opportunity_id: string | null;
  pending_statements: number; open_opportunity_id: string | null; open_opportunity_status: string | null;
  open_opportunity_application_id: string | null; closed_at: string | null; renewal_rule: Record<string, unknown> | null;
  balance: BalanceView; rule: { rule_type: string; description: string; source: string; percent_threshold?: number | null; months_before_maturity?: number | null };
  renewal: Renewal; next_action: string; last_contact_at?: string | null;
};
export type Summary = {
  total_original_financing: number; open_original_financing: number; estimated_outstanding: number; outstanding_has_estimates: boolean;
  active_facilities: number; renewal_eligible: number; renewals_next_90_days: number; revenue_current_month: number;
  revenue_ytd: number; revenue_lifetime: number; expected_future_revenue: number;
  follow_up: { due_now: number; next_30: number; next_60: number; next_90: number; approaching_50: number; no_contact_90_days: number; last_contact_at: string | null };
  by_product: Array<{ product: string; amount: number; percent: number }>;
  milestones: Array<{ contract_id: string; title: string; date: string | null; detail: string }>;
};
export type PaymentStatus = { id: string; kind: string; due_on: string | null; period_label: string | null; expected_amount: number; received: number; variance: number; status: string; flagged: boolean; reviewed: boolean };
export type Revenue = { current_month: number; ytd: number; lifetime: number; lifetime_gross: number; expected_future: number; next_expected: PaymentStatus | null; variances: PaymentStatus[]; schedule: PaymentStatus[] };
export type LedgerEntry = { id: string; entry_type: string; amount: string | number; is_revenue: boolean; broker_split_amount: string | number; referral_split_amount: string | number; effective_on: string; period_label: string | null; notes: string | null; corrects_entry_id: string | null; corrected: boolean; created_by_name: string | null; created_at: string; document_id: string | null };
export type Detail = {
  contract: Contract; ledger: LedgerEntry[]; revenue: Revenue;
  opportunities: Array<{ id: string; kind: string; status: string; application_id: string | null; new_contract_id: string | null; reason: string | null; created_at: string; application_stage: string | null }>;
  activity: Array<{ id: string; created_at: string; title: string; detail: string | null; channel: string | null }>;
  assets: Array<{ id: string; description: string; year: number | null; make: string | null; model: string | null; serial_number: string | null; vendor: string | null; cost: string | null; location: string | null }>;
  insurance: Array<{ id: string; insurer: string; policy_number: string | null; coverage: string | null; expires_on: string | null; document_id: string | null; replaced_at: string | null }>;
  documents: { contract_documents: Array<{ id: string; kind: string; filename: string; created_at: string; source: string }>; application_documents: Array<{ id: string; filename: string; category: string | null; created_at: string }> };
  reviews: Review[];
  chain: Array<{ id: string; status: string; lender_name: string | null; product_name: string | null; funded_at: string | null; original_amount: string | null }>;
  balances: Array<{ id: string; balance: string; as_of: string; source: string; payments_made: number | null; arrears: string | null; note: string | null }>;
};
export type Review = { id: string; contract_id: string | null; filename: string | null; extracted: { balance?: number | null; as_of?: string | null; payments_made?: number | null; arrears?: number | null; borrower_name?: string | null; lender_name?: string | null }; status: string; error: string | null; created_at: string; company_name?: string | null; lender_name?: string | null };
export type Settings = { silo: string; auto_email: boolean; auto_sms: boolean; email_subject: string | null; email_body: string | null; sms_body: string | null; no_contact_months: number; client_portal: boolean };

const B = "/api/active-contracts";
export const acApi = {
  list: (q: { company_id?: string; contact_id?: string } = {}) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as Array<[string, string]>).toString();
    return api.get<{ contracts: Contract[]; summary: Summary }>(`${B}${p ? `?${p}` : ""}`);
  },
  detail: (id: string) => api.get<Detail>(`${B}/${encodeURIComponent(id)}`),
  create: (body: Record<string, unknown>) => api.post<{ id: string }>(B, body),
  patch: (id: string, body: Record<string, unknown>) => api.patch(`${B}/${id}`, body),
  status: (id: string, status: string, note?: string, payoff_amount?: number | null) => api.post(`${B}/${id}/status`, { status, note, payoff_amount }),
  openOpportunity: (id: string, kind: string, reason?: string) => api.post(`${B}/${id}/opportunities`, { kind, reason }),
  updateOpportunity: (id: string, oppId: string, status: string, note?: string) => api.patch(`${B}/${id}/opportunities/${oppId}`, { status, note }),
  startRenewal: (id: string, kind = "renewal") => api.post<{ opportunityId: string; applicationId: string }>(`${B}/${id}/renewal/start`, { kind }),
  compensation: (id: string, body: Record<string, unknown>) => api.put(`${B}/${id}/compensation`, body),
  addExpected: (id: string, body: Record<string, unknown>) => api.post(`${B}/${id}/expected`, body),
  reviewExpected: (id: string, eid: string, waive = false) => api.post(`${B}/${id}/expected/${eid}/review`, { waive }),
  addLedger: (id: string, body: Record<string, unknown>) => api.post(`${B}/${id}/ledger`, body),
  correctLedger: (id: string, entryId: string, reason: string) => api.post(`${B}/${id}/ledger/${entryId}/correct`, { reason }),
  addBalance: (id: string, body: Record<string, unknown>) => api.post(`${B}/${id}/balances`, body),
  addAsset: (id: string, body: Record<string, unknown>) => api.post(`${B}/${id}/assets`, body),
  removeAsset: (id: string, assetId: string) => api.delete(`${B}/${id}/assets/${assetId}`),
  addInsurance: (id: string, body: Record<string, unknown>) => api.post(`${B}/${id}/insurance`, body),
  upload: (id: string, file: File, kind: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    return api.post<{ document: { id: string }; review: { id: string; status: string } | null }>(`${B}/${id}/documents`, fd);
  },
  openFile: async (id: string, docId: string) => {
    const res = await rawApiFetch(`${B}/${id}/documents/${docId}/file`, { method: "GET" });
    if (!res.ok) throw new Error("Could not open the file.");
    const url = URL.createObjectURL(await res.blob());
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  queues: () => api.get<{ titles: Record<string, string>; counts: Record<string, number> }>(`${B}/queues`),
  queue: (key: string, months?: number) => api.get<{ title: string; contracts: Contract[] }>(`${B}/queues/${key}${months ? `?months=${months}` : ""}`),
  reviews: () => api.get<{ reviews: Review[] }>(`${B}/reviews`),
  confirmReview: (rid: string, body: Record<string, unknown>) => api.post(`${B}/reviews/${rid}/confirm`, body),
  rejectReview: (rid: string) => api.post(`${B}/reviews/${rid}/reject`, {}),
  settings: () => api.get<{ settings: Settings }>(`${B}/settings`),
  saveSettings: (s: Partial<Settings>) => api.put<{ settings: Settings }>(`${B}/settings`, s),
  report: () => api.get<{ report: Record<string, any> }>(`${B}/reports/portfolio`),
  rule: (productId: string) => api.get<{ rule: Record<string, any> | null }>(`${B}/renewal-rules/${encodeURIComponent(productId)}`),
  saveRule: (productId: string, body: Record<string, unknown>) => api.put(`${B}/renewal-rules/${encodeURIComponent(productId)}`, body),
};

export function errorText(e: unknown): string {
  const d = (e as { details?: { error?: string; field?: string } } | null)?.details;
  if (d?.error) return d.error.replace(/_/g, " ") + (d.field ? ` (${d.field})` : "");
  return (e as Error)?.message || "Something went wrong.";
}
