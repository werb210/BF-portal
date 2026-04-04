import api from "@/api";
import { requireAuth } from "@/utils/requireAuth";
import { useCrmStore } from "@/state/crm.store";
async function requestJson(path, options = {}) {
    requireAuth();
    const method = (options.method ?? "GET").toUpperCase();
    const payload = options.body ? JSON.parse(String(options.body)) : undefined;
    if (method === "POST") {
        return api.post(path, payload);
    }
    if (method === "PATCH") {
        return api.patch(path, payload);
    }
    return api.get(path);
}
export const fetchContacts = async () => {
    const { silo, filters } = useCrmStore.getState();
    const params = new URLSearchParams({ silo });
    if (filters.search)
        params.set("search", filters.search);
    if (filters.owner)
        params.set("owner", filters.owner);
    if (filters.hasActiveApplication)
        params.set("hasActiveApplication", "true");
    return requestJson(`/api/crm/contacts?${params.toString()}`);
};
export const fetchCompanies = async () => {
    const { silo } = useCrmStore.getState();
    const params = new URLSearchParams({ silo });
    return requestJson(`/api/crm/companies?${params.toString()}`);
};
export const fetchTimeline = async (entityType, entityId) => {
    const params = new URLSearchParams({ entityType, entityId });
    return requestJson(`/api/crm/timeline?${params.toString()}`);
};
export const createNote = async (entityId, summary) => requestJson("/api/crm/timeline/notes", { method: "POST", body: JSON.stringify({ entityId, summary }) });
export const logCallEvent = async (payload) => requestJson("/api/crm/timeline/calls", { method: "POST", body: JSON.stringify(payload) });
export const fetchApplications = async (contactId) => requestJson(`/api/crm/contacts/${contactId}/applications`);
export const fetchContactCompanies = async (contact) => requestJson(`/api/crm/contacts/${contact.id}/companies`);
export const fetchCompanyContacts = async (company) => requestJson(`/api/crm/companies/${company.id}/contacts`);
export const createContact = async (payload) => requestJson("/api/crm/contacts", { method: "POST", body: JSON.stringify(payload) });
export const createCompany = async (payload) => requestJson("/api/crm/companies", { method: "POST", body: JSON.stringify(payload) });
export const linkContactCompany = async (contactId, companyId) => requestJson(`/api/crm/contacts/${contactId}/companies/${companyId}`, { method: "POST" });
export const createContactApplication = async (payload) => requestJson("/api/crm/applications", { method: "POST", body: JSON.stringify(payload) });
export async function fetchLeads() {
    return requestJson("/api/crm/leads");
}
export async function fetchLeadById(id) {
    return requestJson(`/api/crm/leads/${id}`);
}
export async function fetchCreditReadinessLeads() {
    return requestJson("/api/crm/credit-readiness");
}
export async function convertReadinessToApplication(id) {
    return requestJson(`/api/crm/credit-readiness/${id}/convert`, { method: "POST" });
}
export async function fetchChatSessions() {
    return requestJson("/api/chat/sessions");
}
export async function fetchContinuationLeads() {
    return requestJson("/api/application/continuations");
}
export const getDeals = async () => {
    requireAuth();
    return api.get("/api/crm/deals");
};
export const updateDealStage = async (id, stage) => {
    requireAuth();
    return api.patch(`/api/crm/deals/${id}`, { stage });
};
