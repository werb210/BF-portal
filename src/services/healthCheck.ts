import { apiClient } from "@/api/apiClient";

export async function serverHealth() {
  return apiClient.get("/health");
}
