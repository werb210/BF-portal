import { apiClient } from "@/lib/api";

export async function serverHealth() {
  return apiClient.get("/api/health");
}
