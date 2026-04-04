import { api } from "@/api";
export async function getEvents(params) {
    const qs = params?.view ? `?view=${encodeURIComponent(params.view)}` : "";
    return api.get(`/events${qs}`);
}
