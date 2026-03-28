import { apiClient } from "@/api/httpClient";

export type LenderSubmissionPayload = {
  applicationId: string;
  lenders: string[];
};

export const lenderSubmissionsApi = {
  send: (payload: LenderSubmissionPayload) => apiClient.post("/lender-submissions", payload)
};
