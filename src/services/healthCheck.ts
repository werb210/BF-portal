import { apiClient } from "@/lib/apiClient";

export async function serverHealth() {
  return apiClient.get("/api/health");
}
