import { apiClient } from "@/api/apiClient"

export async function acceptDocument(documentId: string) {
  return apiClient.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  return apiClient.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}

export async function downloadDocument(documentId: string) {
  return apiClient.get(`/documents/${documentId}/download`, {
    responseType: "blob"
  })
}
