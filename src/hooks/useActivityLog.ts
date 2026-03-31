import api from "@/lib/api";

export function logActivity(action: string, metadata?: unknown) {
  return api.post("/audit/activity", {
    action,
    metadata,
    timestamp: new Date().toISOString()
  });
}
