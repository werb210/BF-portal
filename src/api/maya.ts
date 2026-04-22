import { apiPost } from "@/api";
import { ApiError } from "@/api/http";

export async function sendMayaMessage(message: string) {
  try {
    return await apiPost("/api/ai/maya/message", {
      message,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      return null;
    }
    throw error;
  }
}
