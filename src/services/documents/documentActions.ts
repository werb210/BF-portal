import { api, apiFetch } from "@/lib/api"

export async function acceptDocument(documentId: string) {
  return api.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  return api.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}

export async function downloadDocument(documentId: string) {
  const response = await apiFetch(`/documents/${documentId}/download`, {
    credentials: "include"
  });
  return response.blob();
}
