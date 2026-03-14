import { apiClient } from "@/api/apiClient";

export const AnalyticsService = {
  getEvents: () => apiClient.get("/analytics/events"),
  getReadiness: () => apiClient.get("/analytics/readiness")
};
