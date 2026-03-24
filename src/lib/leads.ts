import { safeApiFetch } from "@/lib/api";

export const fetchLeads = async () => {
  const res = await safeApiFetch("/api" + "/crm/leads");
  return Array.isArray(res) ? res : [];
};
