import { apiClient } from "@/api/client";

export const SupportService = {
  listEscalations: () => apiClient.get("/support/escalations"),
  listIssues: () => apiClient.get("/support/issues")
};
