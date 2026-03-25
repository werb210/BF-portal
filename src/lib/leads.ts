import { safeApiFetch } from "@/lib/api";

export const fetchLeads = async () => {
  const res = await safeApiFetch("/crm/leads");
  return Array.isArray(res) ? res : [];
};
