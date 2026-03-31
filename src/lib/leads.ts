import { apiFetch } from "@/api/client";

export const fetchLeads = async () => {
  const res = await apiFetch("/api/crm/leads");
  return Array.isArray(res) ? res : [];
};
