import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function startCall(to: string) {
  return api(ENDPOINTS.callStart, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export async function sendStatus(callId: string, status: string) {
  return api(ENDPOINTS.voiceStatus, {
    method: "POST",
    body: JSON.stringify({
      callId,
      status,
    }),
  });
}
