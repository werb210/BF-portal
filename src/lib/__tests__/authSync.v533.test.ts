// BF_PORTAL_BLOCK_v533
import { beforeEach, describe, expect, it, vi } from "vitest";

const secureRemove = vi.fn(async () => undefined);
vi.mock("../secureStore", () => ({ isNative: () => true, secureSet: vi.fn(async () => undefined), secureRemove: (...a: unknown[]) => secureRemove(...(a as [])) }));

import { AUTH_STORAGE_KEY, clearAuthToken, setAuthToken } from "../authToken";
import { handleAuthStorageEvent } from "../authSync";

beforeEach(() => {
  localStorage.clear();
  secureRemove.mockClear();
  window.history.replaceState({}, "", "/login");
});

describe("v533 sign-out", () => {
  it("signing out does not recurse (it used to overflow the stack)", () => {
    setAuthToken("a.b.c");
    expect(() => clearAuthToken()).not.toThrow();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(secureRemove).toHaveBeenCalledTimes(1);
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
    handleAuthStorageEvent({ key: AUTH_STORAGE_KEY, newValue: null, oldValue: "a.b.c" });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(secureRemove).toHaveBeenCalledTimes(1);
  });
  it("ignores other keys and new sign-ins", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "a.b.c");
    handleAuthStorageEvent({ key: "something_else", newValue: null, oldValue: "x" });
    handleAuthStorageEvent({ key: AUTH_STORAGE_KEY, newValue: "d.e.f", oldValue: null });
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe("a.b.c");
  });
});
