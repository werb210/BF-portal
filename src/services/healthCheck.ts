import { api } from "@/api";

export async function serverHealth() {
  return api.get("/api/health");
}
