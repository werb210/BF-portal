// BF_PORTAL_v872_QUOTES - quotes (BF-Server /api/quotes), ported from KS-Portal #44. Shapes match src/quotes/service.ts there.
import { api } from "@/api";
import { apiBlob } from "@/utils/api";

export type Frequency = "daily" | "weekly" | "biweekly" | "semimonthly" | "monthly";
export type Fee = { label: string; amount: number; deducted: boolean; taxable?: boolean };
export type TaxLine = { label: string; amount: number };
export type Province = { code: string; name: string };
export type QuoteOption = {
  id?: string; offer_id: string | null; lender_name: string; product_name: string | null; amount: number; term_months: number | null;
  rate_kind: "interest_rate" | "factor_rate"; rate: number | null; payment_frequency: Frequency; payment_count?: number | null;
  payment_amount: number | null; payment_overridden: boolean; fees: Fee[]; tax_lines?: TaxLine[]; total_tax?: number; total_fees?: number; total_repayment?: number | null;
  cost_of_borrowing?: number | null; net_proceeds?: number | null; estimated_apr?: number | null; recommended: boolean; notes: string | null;
};
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "withdrawn";
export type Quote = {
  id: string; application_id: string; quote_number: string; status: QuoteStatus; title: string; message: string | null; currency: "CAD" | "USD";
  tax_province: string | null; expires_on: string | null; pdf_document_id: string | null; accepted_option_id: string | null; accepted_name: string | null; decline_reason: string | null;
  view_count: number; created_at: string; sent_at: string | null; first_viewed_at: string | null; last_viewed_at: string | null;
  accepted_at: string | null; declined_at: string | null; withdrawn_at: string | null; options: QuoteOption[];
};
export type OfferOnFile = { id: string; lender_name: string; amount: number | null; rate_factor: string | null; term: string | null; payment_frequency: string | null; expiry_date: string | null; recommended: boolean; status: string };
export type QuoteEvent = { kind: string; actor: string; at: string; detail: Record<string, unknown> };

const app = (id: string) => `/api/quotes/applications/${encodeURIComponent(id)}`;
const one = (id: string) => `/api/quotes/${encodeURIComponent(id)}`;

export const quotesApi = {
  list: (applicationId: string) => api.get<{ ok: boolean; quotes: Quote[]; offers: OfferOnFile[]; default_tax_province: string | null; provinces: Province[] }>(app(applicationId)),
  create: (applicationId: string, offerIds: string[]) => api.post<{ ok: boolean; quote: Quote }>(app(applicationId), offerIds.length ? { offer_ids: offerIds } : { options: [] }),
  get: (id: string) => api.get<{ ok: boolean; quote: Quote; events: QuoteEvent[] }>(one(id)),
  save: (id: string, patch: Partial<Pick<Quote, "title" | "message" | "expires_on" | "currency" | "tax_province">> & { options?: QuoteOption[] }) => api.put<{ ok: boolean; quote: Quote }>(one(id), patch),
  send: (id: string) => api.post<{ ok: boolean; quote: Quote }>(`${one(id)}/send`, {}),
  withdraw: (id: string) => api.post<{ ok: boolean; quote: Quote }>(`${one(id)}/withdraw`, {}),
  duplicate: (id: string) => api.post<{ ok: boolean; quote: Quote }>(`${one(id)}/duplicate`, {}),
  pdf: (id: string) => apiBlob(`${one(id)}/pdf`),
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Draft", bg: "#f1f5f9", fg: "#1e293b" },
  sent: { label: "Sent", bg: "#e0e7ff", fg: "#1e1b4b" },
  viewed: { label: "Viewed", bg: "#dbeafe", fg: "#1e3a8a" },
  accepted: { label: "Accepted", bg: "#dcfce7", fg: "#14532d" },
  declined: { label: "Declined", bg: "#fee2e2", fg: "#7f1d1d" },
  expired: { label: "Expired", bg: "#fef3c7", fg: "#78350f" },
  withdrawn: { label: "Withdrawn", bg: "#f1f5f9", fg: "#1e293b" },
};

export const FREQ_LABEL: Record<Frequency, string> = { daily: "Daily (business days)", weekly: "Weekly", biweekly: "Every two weeks", semimonthly: "Twice a month", monthly: "Monthly" };
export const money = (v: number | null | undefined, cur = "CAD") => (v === null || v === undefined || !Number.isFinite(v) ? "-" : `$${v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur === "USD" ? " USD" : ""}`);
