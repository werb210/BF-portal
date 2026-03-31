import { setToken } from "./apiClient";

export function hydrateSession(): void {
  const t = sessionStorage.getItem("token");
  if (t && typeof t === "string") {
    setToken(t);
  }
}

export function persistToken(t: string): void {
  sessionStorage.setItem("token", t);
}
