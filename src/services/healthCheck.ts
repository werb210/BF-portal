import { api } from "@/lib/api";

export async function serverHealth() {
  return api.get("/api/health");
}
