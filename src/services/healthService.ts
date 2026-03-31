import { apiFetch } from "@/lib/apiClient";

export async function checkServerHealth() {
  return apiFetch("/api/health");
}
