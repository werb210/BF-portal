// BF_SILO_API_ROUTING_v43 — Block 43
// Pin the routing discriminator. If anyone reverts to single-server routing,
// this test fails red. The bug Todd reported (BF contacts in BI CRM) was
// caused exactly by single-server routing, so this is a regression pin.
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  // Pretend production envs are set so the test isn't dependent on
  // import.meta.env defaults that vitest provides.
  vi.stubEnv("VITE_BF_API_URL", "https://server.boreal.financial");
  vi.stubEnv("VITE_BI_API_URL", "https://bi-server.example.com");
});

describe("config/api resolveApiBase", () => {
  it("routes /api/v1/* paths to BI-Server", async () => {
    const { resolveApiBase } = await import("../api");
    expect(resolveApiBase("/api/v1/bi/applications")).toBe("https://bi-server.example.com");
    expect(resolveApiBase("/api/v1/bi/quote/estimate")).toBe("https://bi-server.example.com");
    expect(resolveApiBase("/api/v1/bi/webhooks/pgi")).toBe("https://bi-server.example.com");
  });

  it("routes /api/* (non-v1) paths to BF-Server", async () => {
    const { resolveApiBase } = await import("../api");
    expect(resolveApiBase("/api/applications")).toBe("https://server.boreal.financial");
    expect(resolveApiBase("/api/portal/lender-submissions")).toBe("https://server.boreal.financial");
    expect(resolveApiBase("/api/auth/otp/start")).toBe("https://server.boreal.financial");
  });

  it("buildApiUrl produces full URLs with the right base", async () => {
    const { buildApiUrl } = await import("../api");
    expect(buildApiUrl("/api/v1/bi/applications")).toBe(
      "https://bi-server.example.com/api/v1/bi/applications",
    );
    expect(buildApiUrl("/api/applications/abc-123")).toBe(
      "https://server.boreal.financial/api/applications/abc-123",
    );
  });

  it("/api/v1 without trailing slash and root /api/v1 do NOT route to BI (must be /api/v1/...)", async () => {
    const { resolveApiBase } = await import("../api");
    // Edge cases — strict prefix match prevents matching '/api/v123' or similar.
    expect(resolveApiBase("/api/v1")).toBe("https://server.boreal.financial");
  });

  it("buildApiUrl rejects relative paths (must start with /)", async () => {
    const { buildApiUrl } = await import("../api");
    expect(() => buildApiUrl("api/applications")).toThrow(/must start with/);
  });
});
