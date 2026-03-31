import { apiFetch } from "@/lib/api";

export const fetchLeads = async () => {
  const res = await apiFetch("/api/crm/leads");
  return Array.isArray(res) ? res : [];
};
