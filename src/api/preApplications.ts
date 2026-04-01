import { apiFetch } from "@/lib/apiClient";

export interface PreApplicationRecord {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  annualRevenue: string | number | null;
  requestedAmount: string | number | null;
}

export async function fetchPreApplications(): Promise<PreApplicationRecord[]> {
  const res = await apiFetch<PreApplicationRecord[]>("/api/preapp/admin/list");
  if (!res.success) {
    throw new Error(res.error);
  }
  if (!Array.isArray(res.data)) {
    return [];
  }
  return res.data;
}

export async function convertPreApplication(id: string) {
  const res = await apiFetch<Record<string, unknown>>("/api/preapp/admin/convert", {
    method: "POST",
    body: { id }
  });
  if (!res.success) return { success: false, error: res.error };
  return { success: true, data: res.data };
}
