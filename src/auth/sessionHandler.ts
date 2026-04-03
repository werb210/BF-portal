export function setSession(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}
