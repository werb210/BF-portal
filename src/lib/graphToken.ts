// BF_PORTAL_MSAL_TOKEN_SECURE_v425
// Nothing in the app currently reads this token back - it was written on every
// silent acquire and never consumed. Rather than delete it (MSAL callers may want
// it later), it is stored properly: Keychain on native, in-memory only on web.
import { secureSet, secureGet, secureRemove, isNative } from "./secureStore";

const KEY = "msgraph_access_token";
let cached: string | null = null;

export async function setGraphAccessToken(token: string): Promise<void> {
  const value = String(token ?? "").trim();
  if (!value) return;
  cached = value;
  // Remove any copy left behind by a build before v425.
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage may be blocked */
  }
  if (isNative()) {
    await secureSet(KEY, value).catch(() => {
      // Fail closed: no token beats a token in UserDefaults.
      cached = null;
    });
  }
}

export async function getGraphAccessToken(): Promise<string | null> {
  if (cached) return cached;
  if (!isNative()) return null;
  cached = await secureGet(KEY);
  return cached;
}

export async function clearGraphAccessToken(): Promise<void> {
  cached = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage may be blocked */
  }
  await secureRemove(KEY);
}
