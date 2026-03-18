import { apiClient } from "@/api/client";

type CallStatus = {
  status: string;
  activeCall: boolean;
  timestamp?: string;
};

export async function getCallStatus(): Promise<CallStatus> {
  try {
    const response = await apiClient.get("/api/telephony/call-status");

    const data = response.data || {};

    return {
      status: data.status ?? "unknown",
      activeCall: data.activeCall ?? false,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error("Portal telephony polling error:", error);

    return {
      status: "offline",
      activeCall: false
    };
  }
}
