import { apiClient } from "@/api/apiClient";

export const SupportService = {
  listEscalations: () => apiClient.get("/support/escalations"),
  listIssues: () => apiClient.get("/support/issues")
};
