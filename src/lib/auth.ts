const TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEY = "bf_token";
const LEGACY_TOKEN_KEY_2 = "token";

export function getToken(): string | null {
  return (
    sessionStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(LEGACY_TOKEN_KEY) ||
    sessionStorage.getItem(LEGACY_TOKEN_KEY_2)
  );
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(LEGACY_TOKEN_KEY, token);
  sessionStorage.setItem(LEGACY_TOKEN_KEY_2, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(LEGACY_TOKEN_KEY_2);
}
