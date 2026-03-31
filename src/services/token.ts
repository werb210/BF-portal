let inMemoryToken: string | null = null

export function setToken(t: string | null) {
  inMemoryToken = t
}

export function getToken(): string | null {
  return inMemoryToken
}

export function clearToken() {
  inMemoryToken = null
}
