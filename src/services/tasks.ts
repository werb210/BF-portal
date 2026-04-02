import { api } from "@/lib/api";

export async function getTasks() {
  return api.get("/api/tasks");
}
