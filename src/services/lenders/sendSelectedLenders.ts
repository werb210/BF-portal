import { apiClient } from "@/api/apiClient"

export interface SendPayload {
  applicationId: string
  lenders: string[]
}

export async function sendSelectedLenders(payload: SendPayload) {
  if (!payload.applicationId) {
    throw new Error("Missing applicationId")
  }

  if (!payload.lenders || payload.lenders.length === 0) {
    throw new Error("No lenders selected")
  }

  const res = await apiClient.post(
    `/applications/${payload.applicationId}/send-to-lenders`,
    { lenders: payload.lenders }
  )

  return res.data
}
