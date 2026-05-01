// BI_HARD_ISOLATION_v59 — pin: routing is silo-based, not path-based.
import { describe, it, expect, vi, beforeEach } from "vitest";

let activeSilo: "BF" | "BI" | "SLF" = "BF";
vi.mock("@/context/BusinessUnitContext", () => ({
  getActiveBusinessUnit: () => activeSilo,
}));

import { resolveApiBase, __apiBaseUrls } from "../api";

describe("BI_HARD_ISOLATION_v59 silo-based routing", () => {
  beforeEach(() => {
    activeSilo = "BF";
  });

  it("routes EVERY call to BI-Server when active silo is BI", () => {
    activeSilo = "BI";
    expect(resolveApiBase("/api/v1/bi/applications")).toBe(__apiBaseUrls.bi);
    expect(resolveApiBase("/api/users/me")).toBe(__apiBaseUrls.bi);
    expect(resolveApiBase("/api/telephony/presence")).toBe(__apiBaseUrls.bi);
    expect(resolveApiBase("/api/ai/ai/sessions")).toBe(__apiBaseUrls.bi);
    expect(resolveApiBase("/api/portal/applications")).toBe(__apiBaseUrls.bi);
    expect(resolveApiBase("/literally/anything")).toBe(__apiBaseUrls.bi);
  });

  it("routes EVERY call to BF-Server when active silo is BF", () => {
    activeSilo = "BF";
    expect(resolveApiBase("/api/v1/bi/applications")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/users/me")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/telephony/presence")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/literally/anything")).toBe(__apiBaseUrls.bf);
  });

  it("routes EVERY call to BF-Server when active silo is SLF (BF and SLF share)", () => {
    activeSilo = "SLF";
    expect(resolveApiBase("/api/v1/bi/applications")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/users/me")).toBe(__apiBaseUrls.bf);
  });

  it("path prefix is no longer authoritative", () => {
    // Same path, different silo → different base.
    activeSilo = "BI";
    const inBi = resolveApiBase("/api/v1/bi/foo");
    activeSilo = "BF";
    const inBf = resolveApiBase("/api/v1/bi/foo");
    expect(inBi).not.toBe(inBf);
  });
});
