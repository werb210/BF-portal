import api from "@/core/apiClient";

export async function sendMayaMessage(message: string) {
  return api.post("/api/maya/message", { message });
}
