import axios from "axios"

export async function acceptDocument(documentId: string) {

  await axios.post("/api/documents/accept", {
    documentId
  })

}

export async function rejectDocument(documentId: string, category: string) {

  await axios.post("/api/documents/reject", {
    documentId,
    category
  })

}
