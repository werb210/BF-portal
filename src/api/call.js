import { api } from "@/api";
import { ENDPOINTS } from "@/lib/endpoints";
export async function startCall(to) {
    return api(ENDPOINTS.callStart, {
        method: "POST",
        body: JSON.stringify({ to }),
    });
}
export async function sendStatus(callId, status) {
    return api(ENDPOINTS.voiceStatus, {
        method: "POST",
        body: JSON.stringify({
            callId,
            status,
        }),
    });
}
