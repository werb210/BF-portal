import axios from "axios"

export async function acceptDocument(documentId: string) {

  await axios.post(`/api/documents/${encodeURIComponent(documentId)}/accept`, {
  })

}

export async function rejectDocument(documentId: string, category: string) {

  await axios.post(`/api/documents/${encodeURIComponent(documentId)}/reject`, {
    category
  })

}
