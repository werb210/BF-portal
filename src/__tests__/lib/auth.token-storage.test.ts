import { beforeEach, describe, expect, it } from "vitest";
import { clearToken, getToken, setToken } from "@/lib/auth";

describe("canonical token storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and reads token only from bf_token", () => {
    setToken("abc123");

    expect(localStorage.getItem("bf_token")).toBe("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("migrates legacy keys into bf_token once", () => {
    localStorage.setItem("auth_token", "legacy-token");

    expect(getToken()).toBe("legacy-token");
    expect(localStorage.getItem("bf_token")).toBe("legacy-token");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("clears canonical and legacy token keys", () => {
    localStorage.setItem("bf_token", "main");
    localStorage.setItem("token", "legacy");

    clearToken();

    expect(localStorage.getItem("bf_token")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("portal_token")).toBeNull();
    expect(localStorage.getItem("jwt")).toBeNull();
  });
});
