import { apiClient } from "@/lib/apiClient"
import { setToken, clearToken } from "@/auth/token"

let refreshing = false

export async function refreshSession(): Promise<boolean> {
  if (refreshing) return false
  refreshing = true

  try {
    const res = await apiClient("/api/auth/refresh", {
      method: "POST",
    })

    if (res?.token) {
      setToken(res.token)
      refreshing = false
      return true
    }

    throw new Error("INVALID_REFRESH")
  } catch {
    clearToken()
    refreshing = false
    return false
  }
}
