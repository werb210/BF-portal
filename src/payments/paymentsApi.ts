// BF_PORTAL_v872_PAYMENTS - BF-Server /api/payments: payment links and bank debit for broker fees on Boreal's own Stripe
// account (ported from KS-Portal #41; no Stripe Connect, no plan gate).
import { api } from "@/api";

export type PaymentLink = {
  id: string; url: string; application_id: string | null; contact_id: string | null; description: string; amount: number;
  currency: string; methods: string[]; status: "open" | "processing" | "paid" | "failed" | "cancelled" | "expired";
  payment_method_type: string | null; amount_received: number | null; paid_at: string | null; processing_at?: string | null; failed_at?: string | null;
  failure_message: string | null;
  sent_channels: string[]; sent_at: string | null; expires_at: string; created_at: string;
  quickbooks_status: string; quickbooks_error: string | null;
};
export type StripeAccount = {
  id: string | null; business_name: string | null; country: string | null; default_currency: string | null;
  charges_enabled: boolean | null; acss_debit_enabled: boolean | null; livemode: boolean;
};
export type PaymentSettings = {
  problem: string | null; configured: boolean; livemode: boolean | null; account: StripeAccount | null; webhook_url: string; webhook_events: string[];
};
export type PaymentsReport = {
  days: number; sent: number; paid: { count: number; amount: number; card?: number; bank_debit?: number }; processing: { count: number; amount: number };
  outstanding: { count: number; amount: number }; failed: number; by_month: Array<{ month: string; amount: number }>;
};
export type RecordRef = { application_id?: string; contact_id?: string };

export const paymentsApi = {
  settings: () => api.get<PaymentSettings>("/api/payments/settings"),
  links: (rec: RecordRef) => api.get<{ configured: boolean; problem: string | null; links: PaymentLink[] }>("/api/payments/links", { params: rec as any }),
  feeSuggestion: (applicationId: string) => api.get<{ fee: { amount: number; description: string } | null }>("/api/payments/fee-suggestion", { params: { application_id: applicationId } }),
  create: (body: unknown) => api.post<{ link: PaymentLink; sent: string[]; refused: { [k: string]: string } }>("/api/payments/links", body),
  send: (id: string, body: { email: boolean; sms: boolean }) => api.post<{ sent: string[]; refused: { [k: string]: string } }>(`/api/payments/links/${id}/send`, body),
  cancel: (id: string) => api.post(`/api/payments/links/${id}/cancel`, {}),
  report: (days = 90) => api.get<PaymentsReport>("/api/payments/report", { params: { days } }),
};

export const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

/** Status words and colours (dark text on light fills, all above 4.5:1). */
export const STATUS: { [k in PaymentLink["status"]]: { label: string; fg: string; bg: string } } = {
  open: { label: "Waiting for payment", fg: "#1e3a8a", bg: "#dbeafe" },
  processing: { label: "Bank debit processing", fg: "#78350f", bg: "#fef3c7" },
  paid: { label: "Paid", fg: "#14532d", bg: "#dcfce7" },
  failed: { label: "Payment failed", fg: "#7f1d1d", bg: "#fee2e2" },
  cancelled: { label: "Cancelled", fg: "#374151", bg: "#f3f4f6" },
  expired: { label: "Expired", fg: "#374151", bg: "#f3f4f6" },
};

export const QBO_TEXT: { [k: string]: string } = {
  recorded: "Recorded in QuickBooks against the fee invoice",
  pending: "Recording in QuickBooks...",
  retrying: "QuickBooks did not answer; retrying",
  failed: "Could not record in QuickBooks",
};
