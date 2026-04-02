import { api } from "@/api";

export const AnalyticsService = {
  getEvents: () => api.get("/api/analytics/events"),
  getReadiness: () => api.get("/api/analytics/readiness")
};
