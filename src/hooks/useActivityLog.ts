import api from "@/api/client";

export function logActivity(action: string, metadata?: unknown) {
  return api.post("/api/audit/activity", {
    action,
    metadata,
    timestamp: new Date().toISOString()
  });
}
