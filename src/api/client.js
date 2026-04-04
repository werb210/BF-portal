import { apiCall } from "@/lib/api";
export async function apiFetch(path, options = {}) {
    return apiCall(path, options);
}
