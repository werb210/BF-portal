import { apiFetch, setToken, clearToken } from "./api";

let currentUser: any = null;

export async function startOtp(phone: string) {
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const res = await apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  setToken((res as any).token);
  currentUser = (res as any).user;

  return res;
}

export async function getMe() {
  if (!currentUser) {
    try {
      currentUser = await apiFetch("/api/auth/me");
    } catch {
      currentUser = null;
    }
  }
  return currentUser;
}

export function logout() {
  clearToken();
  currentUser = null;
}

export { setToken, clearToken, getToken } from "./api";
