import { apiPost } from "@/api";
export async function sendMayaMessage(message) {
    return apiPost("/api/maya/message", {
        message,
    });
}
