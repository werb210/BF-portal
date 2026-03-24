import { apiRequest } from "@/lib/api";

export const getTelephonyToken = () =>
  apiRequest("/telephony/token");
