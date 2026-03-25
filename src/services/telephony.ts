import { apiFetch } from "@/lib/api";

export async function getTelephonyToken() {
  const result = await apiFetch("/telephony/token", {
    method: "GET",
  });

  if (!result?.token) {
    throw new Error("Telephony token missing");
  }

  return result.token;
}
