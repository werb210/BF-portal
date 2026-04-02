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

export async function getOffers(id: string) {
  return api<OfferRecord[]>(`/api/offers/${id}`);
}

export async function fetchOffers(applicationId: string, options?: { signal?: AbortSignal }) {
  const res = await api<OfferRecord[]>(`/api/offers/${applicationId}`, { signal: options?.signal });
  if ("error" in res) throw new Error(res.error.message);
  return res.data;
}

export async function uploadOffer(applicationIdOrBody: string | any, file?: File) {
  const body =
    typeof applicationIdOrBody === "string" && file
      ? { applicationId: applicationIdOrBody, fileName: file.name }
      : applicationIdOrBody;

  return api("/api/offers", {
    method: "POST",
    body,
  });
}

export async function archiveOffer(id: string) {
  return api(`/api/offers/${id}`, {
    method: "DELETE",
  });
}
