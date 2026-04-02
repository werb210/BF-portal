import { apiClient } from "@/lib/api";

export async function getTasks() {
  return apiClient.get("/api/tasks");
}
