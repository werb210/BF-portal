import api from "@/api";

export async function fetchCallHistory(applicationId: string) {
  return api.get(`/dialer/calls?applicationId=${applicationId}`);
}

export async function fetchStaffCallStats() {
  return api.get(`/dialer/stats`);
}

