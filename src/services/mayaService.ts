import { api as api } from "@/lib/api";

export async function sendMayaMessage(message: string) {
  return api.post("/api/maya/message", { message });
}
