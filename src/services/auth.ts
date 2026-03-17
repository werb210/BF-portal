import apiClient from "../core/apiClient";
import { clearToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/lib/api";
import { normalizePhone } from "../utils/normalizePhone";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  capabilities?: string[];
};

export async function startOtp(payload: { phone: string }) {
  const phone = normalizePhone(payload.phone);

  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(phone: string, code: string) {
  console.log("OTP verify payload", { phone, code });

  const res = await apiClient.post("/api/auth/otp/verify", {
    phone,
    code
  });

  const data = res?.data;

  console.log("STAFF_OTP_VERIFY_RESPONSE", data);

  if (!data?.ok) {
    throw new Error(data?.error?.message || "Verification failed");
  }

  const sessionToken = data?.data?.sessionToken;

  if (!sessionToken) {
    throw new Error("Missing sessionToken");
  }

  localStorage.setItem("access_token", sessionToken);

  const nextPath = data?.data?.nextPath || "/dashboard";

  window.location.href = nextPath;
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("access_token");
  }
  delete apiClient.defaults.headers.common.Authorization;
}


export async function getCurrentUser() {
  const res = await apiClient.get("/api/auth/me");
  return res?.data ?? null;
}
