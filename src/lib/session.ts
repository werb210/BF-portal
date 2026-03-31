import { setToken } from "@/services/token";

export function hydrateSession(): void {
  const t = sessionStorage.getItem("token");
  if (t && typeof t === "string") {
    setToken(t);
  }
}

export function persistToken(t: string): void {
  sessionStorage.setItem("token", t);
}
