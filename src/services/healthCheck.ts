import { apiClient } from "@/api/client";

export async function serverHealth() {
  return apiClient.get("/api/health");
}
