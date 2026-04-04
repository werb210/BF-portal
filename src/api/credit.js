import { api } from "@/api";
export const fetchCreditSummary = (applicationId, options) => api.get(`/internal/application/${applicationId}/credit-summary`, options);
export const regenerateCreditSummary = (applicationId) => api.post(`/internal/application/${applicationId}/credit-summary/regenerate`);
