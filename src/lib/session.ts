import { clearToken, getToken } from "@/auth/token"

export function hydrateSession() {
  const t = getToken()

  if (!t) {
    clearToken()
  }
}
