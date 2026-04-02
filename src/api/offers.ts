import { api } from "@/utils/api";

export type OfferRecord = {
  id: string;
  applicationId?: string;
  lenderName?: string;
  status?: string;
  amount?: number;
  rate?: number;
  term?: string;
  fees?: string;
  fileName?: string;
  fileUrl?: string;
  lenderId?: string;
  lender_id?: string;
  uploadedAt?: string;
  createdAt?: string;
};

export const getOffers = (appId: string) => api<OfferRecord[]>(`/api/offers/${appId}`);

export const fetchOffers = (applicationId: string, options?: { signal?: AbortSignal }) =>
  api<OfferRecord[]>(`/api/offers/${applicationId}`, { signal: options?.signal });

export function uploadOffer(payload: Record<string, unknown>) {
  return api<OfferRecord>("/api/offers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const archiveOffer = (id: string) =>
  api<void>(`/api/offers/${id}`, {
    method: "DELETE",
  });
