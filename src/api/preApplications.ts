import { apiFetch } from "@/api/client";

export interface PreApplicationRecord {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  annualRevenue: string | number | null;
  requestedAmount: string | number | null;
}

export async function fetchPreApplications(): Promise<PreApplicationRecord[]> {
  const res = await apiFetch("/api/preapp/admin/list");
  return Array.isArray(res) ? res : [];
}

export async function convertPreApplication(id: string) {
  const res = await apiFetch("/api/preapp/admin/convert", {
    method: "POST",
    body: JSON.stringify({ id })
  });
  return res as Record<string, unknown>;
}
