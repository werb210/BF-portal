// BF_PORTAL_BLOCK_v89_LENDER_SPA_v1
import api from "@/api";

export type LenderApp = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  business_name?: string;
  contact_name?: string;
  contact_email?: string;
  loan_amount?: number;
  product_id?: string;
};

export type LenderProduct = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export type LenderMe = {
  user: { id: string; role: string; lenderId: string };
  lender: { id: string; name: string; country?: string; status?: string; email?: string } | null;
};

export const lenderApi = {
  me: () => api.get<LenderMe>("/api/lender/me"),
  applications: () => api.get<{ items: LenderApp[] }>("/api/lender/applications"),
  application: (id: string) => api.get<LenderApp>(`/api/lender/applications/${id}`),
  products: () => api.get<{ items: LenderProduct[] }>("/api/lender/products"),
};
