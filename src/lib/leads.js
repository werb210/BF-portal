import { api } from "@/api";
export const fetchLeads = async () => {
    const res = await api("/api/v1/crm/leads");
    return Array.isArray(res) ? res : [];
};
