import { apiClient } from "@/lib/apiClient";

export const AnalyticsService = {
  getEvents: () => apiClient.get("/api/analytics/events"),
  getReadiness: () => apiClient.get("/api/analytics/readiness")
};
