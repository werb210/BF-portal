import { api } from "@/lib/apiClient";

export interface PreApplicationRecord {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  annualRevenue: string | number | null;
  requestedAmount: string | number | null;
}

export async function fetchPreApplications(): Promise<PreApplicationRecord[]> {
  const data = await api<PreApplicationRecord[]>("/api/preapp/admin/list");
  return Array.isArray(data) ? data : [];
}

export async function convertPreApplication(id: string) {
  return api<Record<string, unknown>>("/api/preapp/admin/convert", {
    method: "POST",
    body: { id }
  });
}
