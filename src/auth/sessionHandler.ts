export function setSession(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
}
