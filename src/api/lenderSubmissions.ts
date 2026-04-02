import { api } from "@/lib/api";

export type LenderSubmissionPayload = {
  applicationId: string;
  lenders: string[];
};

export const lenderSubmissionsApi = {
  send: (payload: LenderSubmissionPayload) => api.post("/api/lender-submissions", payload)
};
