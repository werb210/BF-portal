import { apiRequest } from "./client";

export async function sendMayaMessage(message: string) {
  const res = await apiRequest("/maya/chat", {
    method: "POST",
    body: { message },
  });
  if (!res.ok) {
    throw new Error("maya_error");
  }

  return res.data;
}
