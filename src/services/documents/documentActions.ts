import axios from "axios"

export async function acceptDocument(documentId: string) {

  return axios.post(`/api/documents/${encodeURIComponent(documentId)}/accept`, {
  })

}

export async function rejectDocument(documentId: string, category: string) {

  return axios.post(`/api/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })

}

export async function downloadDocument(documentId: string) {

  return axios.get(`/api/documents/${documentId}/download`, {
    responseType: "blob"
  })

}
