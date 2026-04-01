import { apiPost } from "@/lib/apiClient";

export async function startCall(to: string) {
  return apiPost("/api/call/start", { to });
}

export async function sendStatus(callId: string, status: string) {
  return apiPost("/api/voice/status", {
    callId,
    status,
  });
}
