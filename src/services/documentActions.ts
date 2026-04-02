import { api } from "@/api"

export async function acceptDocument(documentId: string) {
  await api.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  await api.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}
