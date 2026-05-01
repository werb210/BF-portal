// BF_PORTAL_BLOCK_1_20_TEST_FIX_FOR_SILO_ROUTING
// Pin silo-based routing per BI_HARD_ISOLATION_v59. If anyone reverts to
// path-based routing or single-server routing, this test fails red.
//
// Architecture under test:
//   BI silo  → BI-Server (always, regardless of path)
//   BF silo  → BF-Server (always, regardless of path)
//   SLF silo → BF-Server (always — BF and SLF share one server)
//
// The active silo is read from sessionStorage by getActiveBusinessUnit().
// We control that here by writing the silo key directly before each call.
import { describe, it, expect, beforeEach, vi } from "vitest";

const STORAGE_KEY = "staff-portal.business-unit";

beforeEach(() => {
  vi.resetModules();
  // Ensure deterministic env so the URL constants don't pick up dev defaults.
  vi.stubEnv("VITE_BF_API_URL", "https://server.boreal.financial");
  vi.stubEnv("VITE_BI_API_URL", "https://bi-server.example.com");
  // Reset sessionStorage so each test starts clean.
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.clear();
  }
});

function setActiveSilo(silo: "BF" | "BI" | "SLF") {
  window.sessionStorage.setItem(STORAGE_KEY, silo);
}

describe("config/api resolveApiBase — silo-based routing", () => {
  it("BI silo routes to BI-Server (regardless of path)", async () => {
    setActiveSilo("BI");
    const { resolveApiBase } = await import("../api");
    expect(resolveApiBase("/api/v1/bi/applications")).toBe("https://bi-server.example.com");
    expect(resolveApiBase("/api/users/me")).toBe("https://bi-server.example.com");
    expect(resolveApiBase("/api/auth/otp/start")).toBe("https://bi-server.example.com");
    expect(resolveApiBase("/anything-at-all")).toBe("https://bi-server.example.com");
  });

  it("BF silo routes to BF-Server (regardless of path)", async () => {
    setActiveSilo("BF");
    const { resolveApiBase } = await import("../api");
    expect(resolveApiBase("/api/applications")).toBe("https://server.boreal.financial");
    expect(resolveApiBase("/api/v1/bi/applications")).toBe("https://server.boreal.financial");
    expect(resolveApiBase("/api/users/me")).toBe("https://server.boreal.financial");
  });

  it("SLF silo routes to BF-Server (BF and SLF share one server)", async () => {
    setActiveSilo("SLF");
    const { resolveApiBase } = await import("../api");
    expect(resolveApiBase("/api/applications")).toBe("https://server.boreal.financial");
    expect(resolveApiBase("/api/v1/anything")).toBe("https://server.boreal.financial");
  });

  it("default (no active silo set) routes to BF-Server", async () => {
    // sessionStorage cleared in beforeEach; getActiveBusinessUnit() returns DEFAULT_BUSINESS_UNIT
    const { resolveApiBase } = await import("../api");
    expect(resolveApiBase("/api/v1/bi/applications")).toBe("https://server.boreal.financial");
    expect(resolveApiBase("/api/applications")).toBe("https://server.boreal.financial");
  });
});

describe("config/api buildApiUrl — produces full URLs with the silo-correct base", () => {
  it("uses BI-Server in BI silo", async () => {
    setActiveSilo("BI");
    const { buildApiUrl } = await import("../api");
    expect(buildApiUrl("/api/v1/bi/applications")).toBe(
      "https://bi-server.example.com/api/v1/bi/applications",
    );
    expect(buildApiUrl("/api/users/me")).toBe(
      "https://bi-server.example.com/api/users/me",
    );
  });

  it("uses BF-Server in BF silo", async () => {
    setActiveSilo("BF");
    const { buildApiUrl } = await import("../api");
    expect(buildApiUrl("/api/applications/abc-123")).toBe(
      "https://server.boreal.financial/api/applications/abc-123",
    );
    expect(buildApiUrl("/api/v1/bi/applications")).toBe(
      "https://server.boreal.financial/api/v1/bi/applications",
    );
  });

  it("rejects relative paths (must start with /)", async () => {
    setActiveSilo("BF");
    const { buildApiUrl } = await import("../api");
    expect(() => buildApiUrl("api/applications")).toThrow(/must start with/);
  });
});

describe("config/api __apiBaseUrls — exposed for tests and WebSocket layer", () => {
  it("exposes both server URLs", async () => {
    const { __apiBaseUrls } = await import("../api");
    expect(__apiBaseUrls.bf).toBe("https://server.boreal.financial");
    expect(__apiBaseUrls.bi).toBe("https://bi-server.example.com");
  });
});
