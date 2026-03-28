import { lenderApiClient } from "@/api/httpClient";

export type LenderAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type LenderCompany = {
  id: string;
  companyName: string;
  website?: string;
  country?: string;
  supportEmail?: string;
  supportPhone?: string;
  description?: string;
  logoUrl?: string;
  address?: LenderAddress;
  updatedAt?: string;
};

export const fetchLenderCompany = () => lenderApiClient.get<LenderCompany>(`/lender/company`);

export const updateLenderCompany = (payload: Partial<LenderCompany>) =>
  lenderApiClient.patch<LenderCompany>(`/lender/company`, payload);

export const uploadLenderLogo = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return lenderApiClient.post<{ url: string }>(`/lender/company/logo`, formData);
};
