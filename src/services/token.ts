const TOKEN_KEY = "token";
const USER_KEY = "boreal_staff_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getTokenOrFail(): string {
  const token = getToken();

  if (!token || token.trim() === "" || token === "undefined" || token === "null") {
    throw new Error("[AUTH BLOCK] INVALID TOKEN");
  }

  return token;
}

export function saveToken(token: string) {
  if (!token || token.trim() === "" || token === "undefined" || token === "null") {
    throw new Error("[INVALID TOKEN WRITE]");
  }

  localStorage.setItem(TOKEN_KEY, token);

  const verify = localStorage.getItem(TOKEN_KEY);

  if (verify !== token) {
    throw new Error("[TOKEN WRITE FAILED]");
  }
}

export function setToken(token: string) {
  saveToken(token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setStoredAccessToken(token: string) {
  setToken(token);
}

export function getStoredAccessToken(): string | null {
  return getToken();
}

export function clearStoredAuth() {
  clearToken();
  sessionStorage.removeItem(USER_KEY);
}

export function setStoredUser(user: unknown) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
