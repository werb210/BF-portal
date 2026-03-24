import { apiRequest, safeApiFetch } from "@/lib/api";
import { type RequestOptions } from "./httpClient";

export type OfferRecord = {
  id: string;
  lenderName: string;
  status?: "active" | "archived";
  amount?: number;
  rate?: number;
  term?: string;
  fees?: string;
  uploadedAt?: string;
  fileName?: string;
  fileUrl?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseOffer = (value: unknown): OfferRecord | null => {
  if (!isRecord(value)) return null;
  const id =
    typeof value.id === "string"
      ? value.id
      : typeof value.offer_id === "string"
        ? value.offer_id
        : "";
  if (!id) return null;
  const lenderName =
    typeof value.lenderName === "string"
      ? value.lenderName
      : typeof value.lender_name === "string"
        ? value.lender_name
        : typeof value.lender === "string"
          ? value.lender
          : "Unknown lender";
  const fileName =
    typeof value.fileName === "string"
      ? value.fileName
      : typeof value.filename === "string"
        ? value.filename
        : typeof value.file_name === "string"
          ? value.file_name
          : undefined;
  const fileUrl =
    typeof value.fileUrl === "string"
      ? value.fileUrl
      : typeof value.file_url === "string"
        ? value.file_url
        : typeof value.url === "string"
          ? value.url
          : undefined;
  const uploadedAt =
    typeof value.uploadedAt === "string"
      ? value.uploadedAt
      : typeof value.uploaded_at === "string"
        ? value.uploaded_at
        : undefined;
  const status =
    typeof value.status === "string"
      ? value.status.toLowerCase() === "archived"
        ? "archived"
        : "active"
      : typeof value.offer_status === "string"
        ? value.offer_status.toLowerCase() === "archived"
          ? "archived"
          : "active"
        : undefined;
  return {
    id,
    lenderName,
    status,
    amount:
      typeof value.amount === "number"
        ? value.amount
        : typeof value.offer_amount === "number"
          ? value.offer_amount
          : undefined,
    rate: typeof value.rate === "number" ? value.rate : undefined,
    term: typeof value.term === "string" ? value.term : undefined,
    fees: typeof value.fees === "string" ? value.fees : undefined,
    uploadedAt,
    fileName,
    fileUrl
  };
};

const parseOffers = (data: unknown): OfferRecord[] => {
  if (Array.isArray(data)) {
    return data.map(parseOffer).filter((offer): offer is OfferRecord => Boolean(offer));
  }
  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items.map(parseOffer).filter((offer): offer is OfferRecord => Boolean(offer));
  }
  return [];
};

export const fetchOffers = async (applicationId: string, options?: RequestOptions): Promise<OfferRecord[]> => {
  const query = new URLSearchParams({ applicationId });
  const offers = await safeApiFetch<unknown>(`/offers?${query.toString()}`, options);

  if (!offers) {
    return [];
  }

  return parseOffers(offers);
};

export const uploadOffer = async (applicationId: string, file: File) => {
  const formData = new FormData();
  formData.append("applicationId", applicationId);
  formData.append("file", file);
  return apiRequest(`/offers`, { method: "POST", body: formData });
};

export const archiveOffer = async (offerId: string) => {
  return apiRequest(`/offers/${offerId}/archive`, { method: "POST" });
};
