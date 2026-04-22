import { api as api } from "@/api";
import { ApiError } from "@/api/http";

export async function sendMayaMessage(message: string) {
  try {
    return await api.post("/api/ai/maya/message", { message });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return null;
    }
    throw error;
  }
}
