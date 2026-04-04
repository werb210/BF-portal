import { api as api } from "@/api";
export async function sendMayaMessage(message) {
    return api.post("/api/maya/message", { message });
}
