let token: string | null = null

export function setToken(t: string | null) {
  token = t
}

export function getToken(): string | null {
  return token
}

export function clearToken() {
  token = null
}
