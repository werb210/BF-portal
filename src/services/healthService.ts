import { apiFetch } from "@/lib/api";

export async function checkServerHealth() {
  return apiFetch("/api/health");
}
