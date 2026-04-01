import { apiClient } from "@/lib/apiClient";
import { ENDPOINTS } from "@/lib/endpoints";

export async function startCall(to: string) {
  return apiClient(ENDPOINTS.callStart, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export async function sendStatus(callId: string, status: string) {
  return apiClient(ENDPOINTS.voiceStatus, {
    method: "POST",
    body: JSON.stringify({
      callId,
      status,
    }),
  });
}
