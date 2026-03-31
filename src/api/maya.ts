import { apiRequest } from "./client";

export async function sendMayaMessage(message: string) {
  const res = await apiRequest("/maya/chat", {
    method: "POST",
    body: { message },
  });

  if (!res.success) {
    return { success: false, message: res.message };
  }

  return { success: true, data: res.data };
}
