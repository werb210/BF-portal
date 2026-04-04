import { api, rawApiFetch } from "@/api";
export async function acceptDocument(documentId) {
    return api.post(`/documents/${encodeURIComponent(documentId)}/accept`, {});
}
export async function rejectDocument(documentId, category) {
    return api.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
        category
    });
}
export async function downloadDocument(documentId) {
    const response = await rawApiFetch(`/documents/${documentId}/download`, {
        credentials: "include"
    });
    return response.blob();
}
