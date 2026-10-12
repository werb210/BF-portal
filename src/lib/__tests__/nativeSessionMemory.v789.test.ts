// BF_PORTAL_v789_NATIVE_SESSION_MEMORY / BF_PORTAL_v789_CLEAR_AUTH
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  native: true,
  keychain: new Map<string, string>(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native } }));
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: {
    get: vi.fn(async (k: string) => h.keychain.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => { h.keychain.set(k, v); }),
    remove: vi.fn(async (k: string) => { h.keychain.delete(k); }),
  },
}));

import { hydrateSecureTokens, NATIVE_SESSION_KEYS, readSessionItem, writeSessionItem, __resetSessionMemory } from "@/lib/secureStore";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/authToken";
import { clearAuth } from "@/lib/authStorage";

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  h.native = true;
  h.keychain.clear();
  localStorage.clear();
  __resetSessionMemory();
});

describe("native: Keychain + memory, never localStorage", () => {
  it("hydrates the Keychain into memory and removes plain copies an older build left", async () => {
    h.keychain.set("auth_token", "kc.jwt");
    h.keychain.set("auth_user", "{\"id\":\"u1\"}");
    localStorage.setItem("auth_token", "stale.jwt");
    await hydrateSecureTokens(NATIVE_SESSION_KEYS);
    expect(getAuthToken()).toBe("kc.jwt");
    expect(readSessionItem("auth_user")).toBe("{\"id\":\"u1\"}");
    for (const k of NATIVE_SESSION_KEYS) expect(localStorage.getItem(k)).toBeNull();
  });

  it("writes through to the Keychain and keeps localStorage empty", async () => {
    setAuthToken("new.jwt");
    writeSessionItem("auth_phone", "+14165551234");
    await flush();
    expect(getAuthToken()).toBe("new.jwt");
    expect(h.keychain.get("auth_token")).toBe("new.jwt");
    expect(h.keychain.get("auth_phone")).toBe("+14165551234");
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("auth_phone")).toBeNull();
  });

  it("clearAuth removes the token, user and phone from memory and the Keychain", async () => {
    setAuthToken("a.b.c");
    writeSessionItem("auth_user", "{}");
    writeSessionItem("auth_phone", "+1");
    await flush();
    clearAuth();
    await flush();
    expect(getAuthToken()).toBeNull();
    expect(readSessionItem("auth_user")).toBeNull();
    expect(readSessionItem("auth_phone")).toBeNull();
    expect([...h.keychain.keys()]).toEqual([]);
  });
});

describe("web: unchanged, localStorage is the store", () => {
  beforeEach(() => { h.native = false; });

  it("reads and writes localStorage and never touches the Keychain", async () => {
    setAuthToken("web.jwt");
    expect(localStorage.getItem("auth_token")).toBe("web.jwt");
    expect(getAuthToken()).toBe("web.jwt");
    await hydrateSecureTokens(NATIVE_SESSION_KEYS);
    expect(localStorage.getItem("auth_token")).toBe("web.jwt");
    clearAuthToken();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(h.keychain.size).toBe(0);
  });

  it("clearAuth also removes auth_user and auth_phone", () => {
    localStorage.setItem("auth_token", "t");
    localStorage.setItem("auth_user", "{}");
    localStorage.setItem("auth_phone", "+1");
    clearAuth();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("auth_user")).toBeNull();
    expect(localStorage.getItem("auth_phone")).toBeNull();
  });
});
