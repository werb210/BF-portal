import { apiFetch } from "@/api/client";

export async function checkServerHealth() {
  return apiFetch("/api/health");
}
