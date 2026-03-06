import axios from "axios"

export async function acceptDocument(documentId: string) {

  return axios.post("/api/documents/accept", {
    documentId
  })

}

export async function rejectDocument(documentId: string, category: string) {

  return axios.post("/api/documents/reject", {
    documentId,
    category
  })

}

export async function downloadDocument(documentId: string) {

  return axios.get(`/api/documents/${documentId}/download`, {
    responseType: "blob"
  })

}
