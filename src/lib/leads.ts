import { apiFetch } from "@/lib/api";

export const fetchLeads = async () => {
  const res = await apiFetch("/api/crm/leads");

  if (!res.ok) {
    throw new Error("Failed to fetch leads");
  }

  return res.json();
};
