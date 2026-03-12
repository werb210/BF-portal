export function getApiBase() {
  const env = import.meta.env

  if (env && typeof env.VITE_API_URL === "string" && env.VITE_API_URL.length > 0) {
    return env.VITE_API_URL.replace(/\/$/, "")
  }

  return "https://api.staff.boreal.financial"
}

export const API_BASE = getApiBase()
