import { apiClient } from "@/lib/api";

export const AnalyticsService = {
  getEvents: () => apiClient.get("/api/analytics/events"),
  getReadiness: () => apiClient.get("/api/analytics/readiness")
};
