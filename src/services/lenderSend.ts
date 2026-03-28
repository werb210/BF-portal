import { apiClient } from "@/api/client"

export async function sendToLenders(applicationId: string, lenders: string[]) {
  const res = await apiClient.post("/lenders/send", {
    applicationId,
    lenders
  })

  return res.data
}
