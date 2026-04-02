import { api } from "@/api"

export async function sendToLenders(applicationId: string, lenders: string[]) {
  const res = await api.post("/api/lenders/send", {
    applicationId,
    lenders
  })

  return res
}
