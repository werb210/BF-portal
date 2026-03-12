const TOKEN_KEY = "boreal_staff_token"
const USER_KEY = "boreal_staff_user"

export function setStoredAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function setStoredUser(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
