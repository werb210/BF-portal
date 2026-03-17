import api from "../core/apiClient";
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
  const res = await fetch(
    "https://server.boreal.financial/api/auth/otp/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone,
        code
      })
    }
  );

  const data = await res.json();

  console.log("STAFF_OTP_VERIFY_RESPONSE", data);

  if (!data.ok) {
    throw new Error(data?.error?.message || "Verification failed");
  }

  if (data.sessionToken) {
    localStorage.setItem("access_token", data.sessionToken);
  }

  window.location.href = "/dashboard";
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("access_token");
  }
  delete api.defaults.headers.common.Authorization;
}


export async function getCurrentUser() {
  const res = await api.get("/api/auth/me");
  return res?.data ?? null;
}
