// BF_PORTAL_v906_OFFER_READER - BF-Server v906 POST /api/broker-tools/applications/:id/offer-document/read: reads a
// lender's offer or term sheet and returns what it says (nothing is saved). Used by the Lenders tab (fill in the term
// sheet form, start a quote from it) and the Funding tab (proposed conditions the broker confirms).
import { api } from "@/api";
import type { Frequency, QuoteOption } from "@/quotes/quotesApi";

export type ReadCondition = { title: string; description: string | null; owner: "staff" | "client" | "lender"; requires_document: boolean };
export type ReadOffer = {
  lender_name: string | null; product_name: string | null; amount: number | null; rate_kind: "interest_rate" | "factor_rate" | null; rate: number | null;
  term_months: number | null; payment_amount: number | null; payment_frequency: Frequency | null; expiry_date: string | null;
  fees: Array<{ label: string; amount: number }>; conditions: ReadCondition[];
};

const path = (applicationId: string) => `/api/broker-tools/applications/${encodeURIComponent(applicationId)}/offer-document/read`;

export function readOfferFile(applicationId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return api.post<{ ok: boolean; read: ReadOffer; offer_id: string | null }>(path(applicationId), fd);
}

export function readOfferOnFile(applicationId: string, offerId: string) {
  return api.post<{ ok: boolean; read: ReadOffer; offer_id: string | null }>(path(applicationId), { offer_id: offerId });
}

/** The term sheet form's fields, from what was read. */
export function termSheetFields(r: ReadOffer): { amount: string; rate: string; term: string; payment: string; expiry: string } {
  const freq: Record<string, string> = { monthly: "Monthly", biweekly: "Bi-weekly", weekly: "Weekly", daily: "Daily", semimonthly: "Monthly" };
  return {
    amount: r.amount !== null ? String(r.amount) : "",
    rate: r.rate === null ? "" : r.rate_kind === "factor_rate" ? `${r.rate} factor` : `${r.rate}%`,
    term: r.term_months !== null ? `${r.term_months} months` : "",
    payment: r.payment_frequency ? freq[r.payment_frequency] ?? "" : "",
    expiry: r.expiry_date ?? "",
  };
}

/** Fills the gaps in a quote option (made from the offer) with what the term sheet says. Typed values win. */
export function applyReadToOption(o: QuoteOption, r: ReadOffer): QuoteOption {
  return {
    ...o,
    lender_name: o.lender_name || r.lender_name || "",
    product_name: o.product_name ?? r.product_name,
    amount: o.amount || r.amount || 0,
    term_months: o.term_months ?? r.term_months,
    rate_kind: r.rate !== null && o.rate === null && r.rate_kind ? r.rate_kind : o.rate_kind,
    rate: o.rate ?? r.rate,
    payment_frequency: r.payment_frequency ?? o.payment_frequency,
    payment_amount: o.payment_overridden ? o.payment_amount : r.payment_amount ?? o.payment_amount,
    payment_overridden: o.payment_overridden || (r.payment_amount !== null && r.payment_amount > 0),
    fees: o.fees.length ? o.fees : r.fees.map((f) => ({ label: f.label, amount: f.amount, deducted: true, taxable: false })),
  };
}
