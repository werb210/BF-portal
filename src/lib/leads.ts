import { apiFetch } from "@/lib/apiClient";

export const fetchLeads = async () => {
  const res = await apiFetch("/api/crm/leads");
  return Array.isArray(res) ? res : [];
};
