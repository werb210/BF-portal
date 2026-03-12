import { apiClient } from "../lib/apiClient";

export async function getCallStatus() {
  try {
    const response = await apiClient.get("/api/telephony/call-status");

    return response.data;
  } catch (error) {
    console.error("Portal telephony polling error:", error);

    return {
      status: "offline",
      activeCall: false
    };
  }
}
