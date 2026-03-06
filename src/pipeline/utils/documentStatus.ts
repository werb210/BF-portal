export interface Document {
  id: string
  status: "pending" | "accepted" | "rejected"
}

export function applicationNeedsDocs(docs: Document[]) {

  if (!docs || docs.length === 0) {
    return true
  }

  for (const doc of docs) {
    if (doc.status === "rejected") {
      return true
    }
  }

  return false
}
