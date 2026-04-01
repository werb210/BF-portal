import { apiClient } from "@/lib/apiClient"

export async function sendToLenders(applicationId: string, lenders: string[]) {
  const res = await apiClient.post("/api/lenders/send", {
    applicationId,
    lenders
  })

  return res
}
