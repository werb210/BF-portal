import { apiClient } from "@/lib/api"

export async function acceptDocument(documentId: string) {
  return apiClient.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  return apiClient.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}

export async function downloadDocument(documentId: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/download`, {
    credentials: "include"
  });
  return response.blob();
}
