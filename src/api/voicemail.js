import { api } from "@/api";
export async function fetchVoicemails(clientId) {
    const data = await api(`/api/calls?clientId=${encodeURIComponent(clientId)}`);
    return Array.isArray(data) ? data : [];
}
