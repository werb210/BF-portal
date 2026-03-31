export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true
  return navigator.onLine
}

export function requireOnline(): void {
  if (!isOnline()) {
    throw new Error("OFFLINE")
  }
}
