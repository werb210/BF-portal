import { setToken } from "./apiClient";

export function hydrateSession() {
  const t = sessionStorage.getItem("token");
  if (t) setToken(t);
}

export function persistToken(t: string) {
  sessionStorage.setItem("token", t);
}
