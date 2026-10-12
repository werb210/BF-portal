// BF_PORTAL_OFFLINE_READ_CACHE_v252
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ native: true }));
vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => h.native, getPlatform: () => (h.native ? "ios" : "web") } };
});
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: { get: vi.fn(async () => null), set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
}));

import { cacheKeyFor, clearOfflineCopies, MAX_ENTRIES, readOfflineCopy, SAVED_COPY_EVENT, saveOfflineCopy, stripSensitive, TTL_MS } from "../readCache";
import { apiFetch } from "@/api";
import { setAuthToken } from "@/lib/authToken";
import { clearAuth } from "@/lib/authStorage";
import { __resetSessionMemory } from "@/lib/secureStore";
import App from "@/App";
import { AuthProvider } from "@/auth/AuthContext";

const ID = "11111111-2222-4333-8444-555555555555";
function mem() {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v), removeItem: (k: string) => void d.delete(k) };
}

describe("what gets a saved copy", () => {
  it("only contacts, companies, their timelines and application details, only in the native app", () => {
    expect(cacheKeyFor(`/api/crm/contacts/${ID}`, "BF", true)).toBe(`BF:/api/crm/contacts/${ID}`);
    expect(cacheKeyFor(`/api/crm/contacts/${ID}/timeline`, "BF", true)).not.toBeNull();
    expect(cacheKeyFor(`/api/applications/${ID}/details`, "BI", true)).toBe(`BI:/api/applications/${ID}/details`);
    expect(cacheKeyFor(`/api/crm/contacts/${ID}`, "BF", false)).toBeNull();
    expect(cacheKeyFor("/api/crm/contacts", "BF", true)).toBeNull();
    expect(cacheKeyFor(`/api/applications/${ID}/banking`, "BF", true)).toBeNull();
  });
});

describe("what is never stored", () => {
  it("strips identity and banking numbers at any depth, and keeps look-alike field names", () => {
    const out = stripSensitive({ name: "Wayne", sin: "645", business: "Endless Sky", dob: "1976-09-30",
      rawPayload: { applicant: { sinSsn: "x", ssn: "y", dateOfBirth: "z", email: "w@e.ca" }, bank: [{ accountNumber: "1", institution: "RBC" }] } }) as any;
    expect(out).toEqual({ name: "Wayne", business: "Endless Sky",
      rawPayload: { applicant: { email: "w@e.ca" }, bank: [{ institution: "RBC" }] } });
  });
});

describe("storage rules", () => {
  it("serves a copy within 24 hours and not after", () => {
    const s = mem();
    saveOfflineCopy("k", { a: 1 }, s, 1_000);
    expect(readOfflineCopy("k", s, 1_000 + TTL_MS - 1)).toEqual({ a: 1 });
    expect(readOfflineCopy("k", s, 1_000 + TTL_MS)).toBeUndefined();
  });
  it("keeps only the most recent records and wipes on sign-out", () => {
    const s = mem();
    for (let i = 0; i < MAX_ENTRIES + 5; i++) saveOfflineCopy(`k${i}`, i, s, 10_000 + i);
    expect(readOfflineCopy("k0", s, 20_000)).toBeUndefined();
    expect(readOfflineCopy(`k${MAX_ENTRIES + 4}`, s, 20_000)).toBe(MAX_ENTRIES + 4);
    clearOfflineCopies(s);
    expect(readOfflineCopy(`k${MAX_ENTRIES + 4}`, s, 20_000)).toBeUndefined();
  });
});

describe("wiring", () => {
  const path = `/api/crm/contacts/${ID}`;
  let online = true;
  beforeEach(() => {
    h.native = true;
    online = true;
    localStorage.clear();
    __resetSessionMemory();
    setAuthToken("a.b.c");
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (!online) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ data: { id: ID, name: "Wayne", sin: "645" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("apiFetch saves a copy online and serves it (announcing it) when the network fails", async () => {
    expect(await apiFetch(path)).toEqual({ id: ID, name: "Wayne", sin: "645" });
    online = false;
    const announced = vi.fn();
    window.addEventListener(SAVED_COPY_EVENT, announced);
    expect(await apiFetch(path)).toEqual({ id: ID, name: "Wayne" });
    window.removeEventListener(SAVED_COPY_EVENT, announced);
    expect(announced).toHaveBeenCalledTimes(1);
  });

  it("a request with no saved copy still fails offline", async () => {
    online = false;
    await expect(apiFetch(`/api/crm/contacts/${ID}/timeline`)).rejects.toThrow("Failed to fetch");
  });

  it("sign-out clears the saved copies", async () => {
    await apiFetch(path);
    expect(readOfflineCopy(`BF:${path}`)).toBeDefined();
    clearAuth();
    online = false;
    expect(readOfflineCopy(`BF:${path}`)).toBeUndefined();
    await expect(apiFetch(path)).rejects.toThrow();
  });

  it("the App shows the saved-copy notice when a copy is served", async () => {
    h.native = false;
    render(<MemoryRouter initialEntries={["/login"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    expect(screen.queryByTestId("saved-copy-notice")).toBeNull();
    act(() => { window.dispatchEvent(new CustomEvent(SAVED_COPY_EVENT)); });
    expect(await screen.findByTestId("saved-copy-notice")).toHaveTextContent("Offline - showing a saved copy");
  });
});
