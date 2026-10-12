// BF_PORTAL_SECURE_TOKEN_STORAGE_v422
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  native: true,
  failSet: false,
  keychain: new Map<string, string>(),
  set: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native } }));
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: {
    get: (k: string) => h.get(k),
    set: (k: string, v: string) => h.set(k, v),
    remove: (k: string) => h.remove(k),
  },
}));

import {
  __resetSessionMemory,
  hydrateSecureTokens,
  NATIVE_SESSION_KEYS,
  secureGet,
  secureRemove,
  secureSet,
  SecureStoreUnavailable,
} from "@/lib/secureStore";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authToken";

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.native = true;
  h.failSet = false;
  h.keychain.clear();
  h.set.mockReset().mockImplementation(async (k: string, v: string) => {
    if (h.failSet) throw new Error("keychain locked");
    h.keychain.set(k, v);
  });
  h.get.mockReset().mockImplementation(async (k: string) => h.keychain.get(k) ?? null);
  h.remove.mockReset().mockImplementation(async (k: string) => { h.keychain.delete(k); });
  localStorage.clear();
  __resetSessionMemory();
});

describe("v422 staff tokens are not left in UserDefaults", () => {
  it("stores values with the secure-storage (Keychain) plugin on native", async () => {
    await secureSet("auth_token", "t1");
    expect(h.set).toHaveBeenCalledWith("auth_token", "t1");
    expect(await secureGet("auth_token")).toBe("t1");
    expect(localStorage.length).toBe(0);
  });

  it("fails closed when the Keychain is unavailable", async () => {
    h.failSet = true;
    await expect(secureSet("auth_token", "t1")).rejects.toBeInstanceOf(SecureStoreUnavailable);
    // v789: the token stays in memory for this run only, never in plain storage.
    setAuthToken("a.b.c");
    await flush();
    expect(getAuthToken()).toBe("a.b.c");
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(h.keychain.has("auth_token")).toBe(false);
  });

  it("mirrors writes to the Keychain and clears it on logout", async () => {
    setAuthToken("a.b.c");
    await flush();
    expect(h.set).toHaveBeenCalledWith("auth_token", "a.b.c");
    expect(h.keychain.get("auth_token")).toBe("a.b.c");
    clearAuthToken();
    await flush();
    expect(h.remove).toHaveBeenCalledWith("auth_token");
    expect(h.keychain.has("auth_token")).toBe(false);
    expect(getAuthToken()).toBeNull();
  });

  // The old "main.tsx calls hydrateSecureTokens before createRoot" ordering check is dropped: main.tsx has
  // top-level side effects (it renders the app) and cannot be imported in a test. What hydration must
  // achieve is tested here instead.
  it("hydration makes the Keychain token available to the synchronous readers", async () => {
    h.keychain.set("auth_token", "kc.jwt");
    expect(getAuthToken()).toBeNull();
    await hydrateSecureTokens(NATIVE_SESSION_KEYS);
    expect(getAuthToken()).toBe("kc.jwt");
  });

  it("is a no-op on web so the browser Portal is unaffected", async () => {
    h.native = false;
    await secureSet("auth_token", "t1");
    expect(await secureGet("auth_token")).toBeNull();
    await secureRemove("auth_token");
    localStorage.setItem("auth_token", "web.jwt");
    await hydrateSecureTokens(NATIVE_SESSION_KEYS);
    expect(h.set).not.toHaveBeenCalled();
    expect(h.get).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();
    expect(getAuthToken()).toBe("web.jwt");
    expect(localStorage.getItem("auth_token")).toBe("web.jwt");
  });
});
