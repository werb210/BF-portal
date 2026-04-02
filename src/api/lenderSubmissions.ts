import { apiClient } from "@/lib/api";

export type LenderSubmissionPayload = {
  applicationId: string;
  lenders: string[];
};

export const lenderSubmissionsApi = {
  send: (payload: LenderSubmissionPayload) => apiClient.post("/api/lender-submissions", payload)
};
