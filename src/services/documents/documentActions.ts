import { api } from "@/lib/api"
import { getEnv } from "@/config/env"

export async function acceptDocument(documentId: string) {
  return api.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  return api.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}

export async function downloadDocument(documentId: string) {
  const { VITE_API_URL } = getEnv();
  const response = await fetch(`${VITE_API_URL}/documents/${documentId}/download`, {
    credentials: "include"
  });
  return response.blob();
}
