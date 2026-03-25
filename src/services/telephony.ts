import { TelephonyToken } from "@/lib/contracts";
import { apiRequest } from "@/lib/api";

export async function getTelephonyToken() {
  const res = await apiRequest("/telephony/token");

  const parsed = TelephonyToken.response.parse(res);

  return parsed.data.token;
}
