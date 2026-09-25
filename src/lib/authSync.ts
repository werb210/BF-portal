// BF_PORTAL_BLOCK_v533 - react to a sign-out (this tab or another) exactly once.
// clearAuthToken() announces the sign-out with a storage event; calling it again
// from here re-announced it and recursed until the stack overflowed.
import { AUTH_STORAGE_KEY, clearToken } from "./authToken";

let handling = false;

export function handleAuthStorageEvent(e: Pick<StorageEvent, "key" | "newValue" | "oldValue">): void {
  if (e.key !== AUTH_STORAGE_KEY || e.newValue) return;
  if (handling) return;
  handling = true;
  try {
    // Another tab signed out: our copy is still here, so clear it once.
    // Our own sign-out already removed it, so there is nothing to clear.
    if (window.localStorage.getItem(AUTH_STORAGE_KEY)) clearToken();
    // Only a real sign-out (there was a token) sends the user to the login page.
    if (e.oldValue && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  } finally {
    handling = false;
  }
}

window.addEventListener("storage", handleAuthStorageEvent);
