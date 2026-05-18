import { api } from "@/api";

export type TelephonyTokenResponse = {
  token?: string;
  outboundCallerId?: string;
  callerId?: string;
  from?: string;
  error?: string;
  missingEnvVar?: string;
};

export async function getTelephonyToken() {
  // BF_DIALER_DIAG_v24
  console.log("[dialer.diag] telephony-token.fetch.start", { ts: new Date().toISOString() });
  const result = await api<TelephonyTokenResponse>("/api/telephony/token", { method: "GET" });
  console.log("[dialer.diag] telephony-token.fetch.result", { hasToken: Boolean(result?.token) });
  const token = result?.token;

  if (!token) {
    const missing = result?.missingEnvVar ? `Missing server env var: ${result.missingEnvVar}` : "";
    const apiError = result?.error ? ` (${result.error})` : "";
    throw new Error(missing || `Telephony token missing${apiError}`);
  }

  return token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}

export async function getTelephonyDiagnostics() {
  return api<TelephonyTokenResponse>("/api/telephony/token", { method: "GET" });
}
