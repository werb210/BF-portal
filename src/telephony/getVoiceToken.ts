import { api } from "@/api";

export async function getTelephonyToken() {
  // BF_DIALER_DIAG_v24
  console.log("[dialer.diag] telephony-token.fetch.start", { ts: new Date().toISOString() });
  const result = await api<{ token?: string }>("/api/telephony/token", { method: "GET" });
  console.log("[dialer.diag] telephony-token.fetch.result", { hasToken: Boolean(result?.token) });
  const token = result.token;

  if (!token) {
    throw new Error("Telephony token missing");
  }

  return token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
