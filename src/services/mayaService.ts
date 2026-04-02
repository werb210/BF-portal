import { api as api } from "@/api";

export async function sendMayaMessage(message: string) {
  return api.post("/api/maya/message", { message });
}
