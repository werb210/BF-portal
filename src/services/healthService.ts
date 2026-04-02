import { api } from "@/lib/api";

export async function checkServerHealth() {
  return api("/api/health");
}
