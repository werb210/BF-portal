import { api } from "@/api";
export async function fetchPreApplications() {
    const data = await api("/api/preapp/admin/list");
    return Array.isArray(data) ? data : [];
}
export async function convertPreApplication(id) {
    return api("/api/preapp/admin/convert", {
        method: "POST",
        body: { id }
    });
}
