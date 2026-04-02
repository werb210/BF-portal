import { api } from "@/api";

export async function checkServerHealth() {
  return api("/api/health");
}
