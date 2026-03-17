import { apiClient } from "@/api/client";

export const AnalyticsService = {
  getEvents: () => apiClient.get("/analytics/events"),
  getReadiness: () => apiClient.get("/analytics/readiness")
};
