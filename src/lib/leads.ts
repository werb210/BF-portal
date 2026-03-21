import { buildUrl } from "@/lib/api";
export const fetchLeads = async () => {
  const res = await fetch(buildUrl("/api/crm/leads"));

  if (!res.ok) {
    throw new Error("Failed to fetch leads");
  }

  return res.json();
};
