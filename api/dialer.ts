import api from "@/lib/api";

export async function fetchCallHistory(applicationId: string) {
  return api.get(`/api/dialer/calls?applicationId=${applicationId}`);
}

export async function fetchStaffCallStats() {
  return api.get(`/api/dialer/stats`);
}

