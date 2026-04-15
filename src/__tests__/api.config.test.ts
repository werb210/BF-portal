import { describe, it, expect, vi } from "vitest";

describe("API config", () => {
  it("API_BASE is defined in test environment", async () => {
    const { API_BASE } = await import("@/config/api");
    expect(typeof API_BASE).toBe("string");
    expect(API_BASE.length).toBeGreaterThan(0);
  });

  it("API_BASE resolves to a usable host in tests", async () => {
    const { API_BASE } = await import("@/config/api");
    expect(API_BASE.startsWith("http://") || API_BASE.startsWith("https://")).toBe(true);
  });

  it("buildApiUrl rejects paths without leading slash", async () => {
    const { buildApiUrl } = await import("@/config/api");
    expect(() => buildApiUrl("api/test")).toThrow("Invalid API path");
  });

  it("buildApiUrl accepts valid paths", async () => {
    const { buildApiUrl } = await import("@/config/api");
    expect(buildApiUrl("/api/auth/me")).toContain("/api/auth/me");
  });


  it("API_BASE in tests is localhost (setupEnv override active)", async () => {
    vi.resetModules();
    const { API_BASE } = await import("@/config/api");
    expect(API_BASE).toContain("localhost");
  });
});
