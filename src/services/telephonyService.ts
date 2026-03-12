import { apiClient } from "../lib/apiClient";

export async function getCallStatus() {
  const response = await apiClient.get("/api/telephony/call-status");
  return response.data;
}
