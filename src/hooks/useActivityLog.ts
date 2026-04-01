import api from "@/lib/apiClient";

export function logActivity(action: string, metadata?: unknown) {
  return api.post("/api/audit/activity", {
    action,
    metadata,
    timestamp: new Date().toISOString()
  });
}
