import { api, type RequestOptions } from "@/lib/api";

export type CreditSummary = {
  businessOverview?: string;
  industryOverview?: string;
  financialOverview?: string;
  riskAssessment?: string;
  collateralOverview?: string;
  termsSummary?: string;
  content?: string;
  status?: string;
  pdfUrl?: string;
};

export const fetchCreditSummary = (applicationId: string, options?: RequestOptions) =>
  api.get<CreditSummary>(`/internal/application/${applicationId}/credit-summary`, options);

export const regenerateCreditSummary = (applicationId: string) =>
  api.post(`/internal/application/${applicationId}/credit-summary/regenerate`);
