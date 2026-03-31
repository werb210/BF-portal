import { apiRequest } from "./client";

export async function sendMayaMessage(message: string) {
  const res = await apiRequest("/maya/chat", {
    method: "POST",
    body: { message },
  });
  return res?.data || res;
}
