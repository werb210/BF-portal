import { lenderApiClient } from "@/api/httpClient";

export type LenderProduct = {
  id: string;
  productName: string;
  category?: string;
  description?: string;
  commissionPercent?: number;
  minAmount?: number;
  maxAmount?: number;
  interestRate?: number;
  termLength?: string;
  additionalRequirements?: string;
  active: boolean;
  lastUpdated?: string;
  applicationFormUrl?: string;
  requiredDocuments?: string[];
};

export type RequiredDocsPayload = {
  categories: string[];
  custom: string[];
};

export const fetchLenderProducts = async () => {
  const res = await lenderApiClient.getList<LenderProduct>(`/lender/products`);
  return res.items;
};

export const createLenderProduct = (payload: Partial<LenderProduct>) =>
  lenderApiClient.post<LenderProduct>(`/lender/products`, payload);

export const updateLenderProduct = (id: string, payload: Partial<LenderProduct>) =>
  lenderApiClient.patch<LenderProduct>(`/lender/products/${id}`, payload);

export const deleteLenderProduct = (id: string) => lenderApiClient.delete<void>(`/lender/products/${id}`);

export const uploadLenderApplicationForm = (id: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return lenderApiClient.post<{ url: string }>(`/lender/products/${id}/application-form`, formData);
};

export const updateRequiredDocuments = (id: string, payload: RequiredDocsPayload) =>
  lenderApiClient.patch<LenderProduct>(`/lender/products/${id}/required-docs`, payload);
