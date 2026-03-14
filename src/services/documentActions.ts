import { apiClient } from "@/api/apiClient"

export async function acceptDocument(documentId: string) {
  await apiClient.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  await apiClient.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}
