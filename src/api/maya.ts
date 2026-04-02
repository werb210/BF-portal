import { apiPost } from "@/api";

export async function sendMayaMessage(message: string) {
  return apiPost("/api/maya/message", {
    message,
  });
}
