import { apiClient } from "@/lib/apiClient";

export const getOffers = (applicationId: string) =>
  apiClient(`/api/offers?applicationId=${applicationId}`);

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

export const fetchOffers = (applicationId: string, options?: { signal?: AbortSignal }) =>
  apiClient.get<OfferRecord[]>(`/api/offers`, { params: { applicationId }, signal: options?.signal });

export const archiveOffer = (offerId: string) =>
  apiClient.post(`/api/offers/${offerId}/archive`, {});

export const uploadOffer = async (applicationId: string, file: File) => {
  const body = new FormData();
  body.append("file", file);
  body.append("applicationId", applicationId);
  return apiClient.post<OfferRecord>("/api/offers/upload", body);
};
