import api from "../core/apiClient";
import { clearToken, setToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/lib/api";
import { normalizePhone } from "@/utils/phone";
import { ENV } from "@/config/env";

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
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const normalizedPayload = {
    phone: normalizePhone(payload.phone),
    code: payload.code
  };
  const res = await api.post("/api/auth/otp/verify", normalizedPayload);
  const data = res?.data ?? {};
  const token = data.accessToken ?? data.token;

  if (token) {
    setToken(token);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("access_token", token);
      window.sessionStorage.setItem(ENV.JWT_STORAGE_KEY, token);
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  return {
    ...data,
    accessToken: token,
  };
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("access_token");
  }
  delete api.defaults.headers.common.Authorization;
}


export async function getCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("access_token");

  if (!token) return null;

  const res = await fetch("/api/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    window.localStorage.removeItem("access_token");
    return null;
  }

  if (!res.ok) {
    throw new Error(`Unable to load current user (${res.status})`);
  }

  return res.json();
}
