import api from "@/api";

export function logActivity(action: string, metadata?: unknown) {
  return api.post("/api/audit/activity", {
    action,
    metadata,
    timestamp: new Date().toISOString()
  });
}
