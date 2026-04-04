import { api } from "@/api";
export async function acceptDocument(documentId) {
    await api.post(`/documents/${encodeURIComponent(documentId)}/accept`, {});
}
export async function rejectDocument(documentId, category) {
    await api.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
        category
    });
}
