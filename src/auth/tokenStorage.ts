const TOKEN_KEY = "boreal_staff_token";

const LEGACY_LOCAL_KEYS = ["auth_token", "access_token", "accessToken", "token"] as const;

export function getToken(): string | null {
  return (
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    null
  );
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("access_token", token);
  localStorage.setItem("accessToken", token);
  localStorage.setItem("token", token);
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  LEGACY_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem(TOKEN_KEY);
}
