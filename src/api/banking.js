import { api } from "@/api";
export const fetchBankingAnalysis = (applicationId, options) => api.get(`/applications/${applicationId}/banking-analysis`, options);
