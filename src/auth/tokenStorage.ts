const TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEY = "bf_token";
const LEGACY_TOKEN_KEY_2 = "token";

export function getToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY_2)
  );
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY_2, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY_2);
}
