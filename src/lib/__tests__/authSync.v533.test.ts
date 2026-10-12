// BF_PORTAL_BLOCK_v533
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  native: false,
  keychain: new Map<string, string>(),
  remove: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native } }));
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: {
    get: vi.fn(async (k: string) => h.keychain.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { h.keychain.set(k, v); }),
    remove: (k: string) => h.remove(k),
  },
}));

import { AUTH_STORAGE_KEY, clearAuthToken, getAuthToken, setAuthToken } from "../authToken";
import { handleAuthStorageEvent } from "../authSync";
import { __resetSessionMemory, hydrateSecureTokens, NATIVE_SESSION_KEYS } from "../secureStore";

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.native = false;
  h.keychain.clear();
  h.remove.mockReset().mockImplementation(async (k: string) => { h.keychain.delete(k); });
  localStorage.clear();
  __resetSessionMemory();
  window.history.replaceState({}, "", "/login");
});

describe("v533 sign-out (web)", () => {
  it("signing out does not recurse (it used to overflow the stack) and is announced once", () => {
    setAuthToken("a.b.c");
    const seen = vi.fn();
    window.addEventListener("storage", seen);
    expect(() => clearAuthToken()).not.toThrow();
    window.removeEventListener("storage", seen);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(seen).toHaveBeenCalledTimes(1);
  });
  it("clearing when nobody is signed in announces nothing", () => {
    const seen = vi.fn();
    window.addEventListener("storage", seen);
    clearAuthToken();
    window.removeEventListener("storage", seen);
    expect(seen).not.toHaveBeenCalled();
  });
  it("a sign-out in another tab clears this tab's copy once", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "a.b.c");
    const seen = vi.fn();
    window.addEventListener("storage", seen);
    handleAuthStorageEvent({ key: AUTH_STORAGE_KEY, newValue: null, oldValue: "a.b.c" });
    window.removeEventListener("storage", seen);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(seen).toHaveBeenCalledTimes(1);
    expect(h.remove).not.toHaveBeenCalled();
  });
  it("ignores other keys and new sign-ins", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "a.b.c");
    handleAuthStorageEvent({ key: "something_else", newValue: null, oldValue: "x" });
    handleAuthStorageEvent({ key: AUTH_STORAGE_KEY, newValue: "d.e.f", oldValue: null });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe("a.b.c");
  });
});

describe("v533 sign-out (native, Keychain-backed session)", () => {
  beforeEach(() => { h.native = true; });

  it("a sign-out event clears the in-memory token and the Keychain copy once", async () => {
    h.keychain.set(AUTH_STORAGE_KEY, "a.b.c");
    await hydrateSecureTokens(NATIVE_SESSION_KEYS);
    expect(getAuthToken()).toBe("a.b.c");
    handleAuthStorageEvent({ key: AUTH_STORAGE_KEY, newValue: null, oldValue: "a.b.c" });
    await flush();
    expect(getAuthToken()).toBeNull();
    expect(h.keychain.has(AUTH_STORAGE_KEY)).toBe(false);
    expect(h.remove).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
