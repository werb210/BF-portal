import { apiClient } from "@/api/httpClient";

export async function getTasks() {
  return apiClient.get("/api/tasks");
}
