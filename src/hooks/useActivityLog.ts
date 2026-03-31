import api from "@/api/client";

export function logActivity(action: string, metadata?: unknown) {
  return api.post("/audit/activity", {
    action,
    metadata,
    timestamp: new Date().toISOString()
  });
}
