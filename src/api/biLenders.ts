// BF_PORTAL_BLOCK_v91_BI_LENDERS_PAGE_v1
import { rawApiFetch } from "@/api";

const BI_TOKEN_KEY = "bi_access_token";
const BF_AUTH_TOKEN_KEY = (import.meta as any).env?.VITE_JWT_STORAGE_KEY || "auth_token";
const getBiToken = () =>
  localStorage.getItem(BI_TOKEN_KEY) || localStorage.getItem(BF_AUTH_TOKEN_KEY);

async function biFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getBiToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.body && !(init.headers as any)?.["Content-Type"] ? { "Content-Type": "application/json" } : {}),
  };
  const res = await rawApiFetch(path, { ...init, headers } as any);
  if (!res || (res as any).ok === false) {
    const status = (res as any)?.status ?? 0;
    throw new Error(`BI-Server ${path} failed (${status})`);
  }
  const body = await (res as Response).json();
  return (body && typeof body === "object" && "data" in body ? (body as any).data : body) as T;
}

export type BiLender = {
  id: string;
  company_name: string;
  website_url: string | null;
  country: string;
  contact_full_name: string;
  contact_email: string;
  contact_phone_e164: string;
  is_active: boolean;
  created_at: string;
};

export type BiApiKey = {
  id: string;
  prefix: string;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
};

export type BiNewKeySecret = {
  id: string;
  created_at: string;
  secret: string;
  note: string;
};

export const biLendersApi = {
  list:        () => biFetch<{ lenders: BiLender[] }>("/api/v1/admin/lenders"),
  create:      (b: Partial<BiLender>) =>
    biFetch<{ id: string }>("/api/v1/admin/lenders", { method: "POST", body: JSON.stringify(b) }),
  update:      (id: string, b: Partial<BiLender>) =>
    biFetch<{ updated: boolean }>(`/api/v1/admin/lenders/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deactivate:  (id: string) =>
    biFetch<{ deactivated: boolean }>(`/api/v1/admin/lenders/${id}`, { method: "DELETE" }),
  listKeys:    (id: string) =>
    biFetch<{ items: BiApiKey[] }>(`/api/v1/admin/lenders/${id}/api-keys`),
  mintKey:     (id: string) =>
    biFetch<BiNewKeySecret>(`/api/v1/admin/lenders/${id}/api-keys`, { method: "POST", body: "{}" }),
  revokeKey:   (id: string, keyId: string) =>
    biFetch<{ revoked: boolean }>(`/api/v1/admin/lenders/${id}/api-keys/${keyId}/revoke`, { method: "POST", body: "{}" }),
};
