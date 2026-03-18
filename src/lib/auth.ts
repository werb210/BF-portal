export function setToken(token: string) {
  localStorage.setItem("bf_token", token);
}

export function getToken() {
  return localStorage.getItem("bf_token");
}

export function clearToken() {
  localStorage.removeItem("bf_token");
}
