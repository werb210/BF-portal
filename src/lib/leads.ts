import { api } from "@/lib/api";

export const fetchLeads = async () => {
  const res = await api<unknown>("/api/crm/leads");
  return Array.isArray(res) ? res : [];
};
