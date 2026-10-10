import { api } from "@/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function startCall(to: string) {
  return api(ENDPOINTS.callStart, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}
