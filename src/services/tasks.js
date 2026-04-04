import { api } from "@/api";
export async function getTasks() {
    return api.get("/api/tasks");
}
