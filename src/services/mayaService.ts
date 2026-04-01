import { apiClient as api } from "@/lib/apiClient";

export async function sendMayaMessage(message: string) {
  return api.post("/api/maya/message", { message });
}
