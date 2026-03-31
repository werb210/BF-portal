import { setToken } from "@/services/token"

export function hydrateSession() {
  const t = sessionStorage.getItem("token")

  if (typeof t === "string" && t.length > 0) {
    setToken(t)
  } else {
    setToken(null)
  }
}
