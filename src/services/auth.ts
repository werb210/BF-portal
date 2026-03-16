import api from "../core/apiClient";
import { clearToken, setToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/lib/api";
import { normalizePhone } from "@/utils/phone";
import { ENV } from "@/config/env";
import { getApiBase } from "@/config/apiBase";
import { normalizeApiPath } from "@/config/api";

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
  delete api.defaults.headers.common.Authorization;
}

const API_URL = getApiBase();
const CURRENT_USER_PATH = normalizeApiPath("/users/me");

export async function getCurrentUser() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return null;
  }

  const res = await fetch(`${API_URL}${CURRENT_USER_PATH}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    return null;
  }

  return res.json();
}
