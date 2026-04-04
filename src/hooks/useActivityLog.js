import api from "@/api";
export function logActivity(action, metadata) {
    return api.post("/api/audit/activity", {
        action,
        metadata,
        timestamp: new Date().toISOString()
    });
}
