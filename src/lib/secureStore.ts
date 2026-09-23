// BF_PORTAL_SECURE_TOKEN_STORAGE_v422
// The native shells shipped only Capacitor Preferences, which is UserDefaults
// on iOS - unencrypted and present in device backups. Staff session tokens now
// live in the Keychain. On web this is a no-op and localStorage stays as-is.
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => Capacitor.isNativePlatform();

export class SecureStoreUnavailable extends Error {
  constructor(cause: unknown) {
    super(`secure_storage_unavailable: ${String((cause as Error)?.message ?? cause)}`);
    this.name = "SecureStoreUnavailable";
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (!isNative()) return;
  try {
    await SecureStorage.set(key, value);
  } catch (error) {
    // Fail CLOSED. Silently falling back to localStorage is how a token ends up
    // in a backup, which is the exact thing this replaces.
    throw new SecureStoreUnavailable(error);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const v = await SecureStorage.get(key);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function secureRemove(key: string): Promise<void> {
  if (!isNative()) return;
  try {
    await SecureStorage.remove(key);
  } catch {
    /* already gone */
  }
}

// Called once at boot, before the app reads any token: pulls the Keychain copy
// into memory so the existing synchronous callers keep working unchanged.
export async function hydrateSecureTokens(keys: string[]): Promise<void> {
  if (!isNative()) return;
  for (const key of keys) {
    const v = await secureGet(key);
    if (v) window.localStorage.setItem(key, v);
  }
}
