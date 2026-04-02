import { api } from "@/lib/api"
import { env } from "@/config/env"

export async function acceptDocument(documentId: string) {
  return api.post(`/documents/${encodeURIComponent(documentId)}/accept`, {})
}

export async function rejectDocument(documentId: string, category: string) {
  return api.post(`/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })
}

export async function downloadDocument(documentId: string) {
  const response = await fetch(`${env.API_URL}/documents/${documentId}/download`, {
    credentials: "include"
  });
  return response.blob();
}
