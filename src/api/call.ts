import { apiRequest } from "@/lib/apiClient";
import { ENDPOINTS } from "@/lib/endpoints";

export async function startCall(to: string) {
  return apiRequest(ENDPOINTS.callStart, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export async function sendStatus(callId: string, status: string) {
  return apiRequest(ENDPOINTS.voiceStatus, {
    method: "POST",
    body: JSON.stringify({
      callId,
      status,
    }),
  });
}
