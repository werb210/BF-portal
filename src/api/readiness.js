import api from "@/api";
const asRecord = (value) => {
    if (!value || typeof value !== "object")
        return null;
    return value;
};
const asDisplayValue = (value) => {
    if (typeof value === "string" && value.trim().length > 0)
        return value;
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return null;
};
const asStringArray = (value) => {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === "string");
};
const parseLead = (value) => {
    const record = asRecord(value);
    if (!record || typeof record.id !== "string")
        return null;
    return {
        id: record.id,
        companyName: typeof record.companyName === "string" ? record.companyName : "",
        contactName: typeof record.contactName === "string" ? record.contactName : "",
        phone: typeof record.phone === "string" ? record.phone : "",
        email: typeof record.email === "string" ? record.email : "",
        industry: typeof record.industry === "string" ? record.industry : "",
        yearsInBusiness: asDisplayValue(record.yearsInBusiness),
        annualRevenue: asDisplayValue(record.annualRevenue),
        monthlyRevenue: asDisplayValue(record.monthlyRevenue),
        accountsReceivable: asDisplayValue(record.accountsReceivable ?? record.arBalance ?? record.ar),
        status: typeof record.status === "string" ? record.status : "new",
        source: typeof record.source === "string" ? record.source : "readiness",
        tags: asStringArray(record.tags ?? ["readiness", "startup_interest"]),
        availableCollateral: asDisplayValue(record.availableCollateral ?? record.collateral),
        createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date(0).toISOString(),
        transcriptHistory: asStringArray(record.transcriptHistory),
        activityLog: asStringArray(record.activityLog)
    };
};
export async function fetchReadinessLeads() {
    const res = await api.get("/api/portal/readiness-leads");
    if (!Array.isArray(res))
        return [];
    return res.map(parseLead).filter((lead) => lead !== null);
}
export async function convertReadinessLeadToApplication(leadId) {
    const res = await api.post(`/portal/readiness-leads/${leadId}/convert`);
    const applicationId = asRecord(res)?.applicationId;
    if (typeof applicationId !== "string" || applicationId.length === 0) {
        return { applicationId: "" };
    }
    return { applicationId };
}
export async function fetchApplicationReadiness(applicationId, options = {}) {
    const res = await api.get(`/applications/${applicationId}/readiness`, options);
    const payload = asRecord(res);
    if (!payload) {
        return { lead: null, transcriptHistory: [] };
    }
    return {
        lead: parseLead(payload.lead),
        transcriptHistory: asStringArray(payload.transcriptHistory)
    };
}
