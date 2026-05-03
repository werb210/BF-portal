import { describe, expect, it } from "vitest";
import { resolveApiBase, __apiBaseUrls } from "../api";

describe("BF_PORTAL_BLOCK_v86 — resolveApiBase routes by path, not by silo", () => {
  it("routes /api/v1/bi/* to BI-Server", () => {
    expect(resolveApiBase("/api/v1/bi/applications")).toBe(__apiBaseUrls.bi);
    expect(resolveApiBase("/api/v1/bi/crm/contacts")).toBe(__apiBaseUrls.bi);
  });
  it("routes /api/v1/pgi/* to BI-Server", () => {
    expect(resolveApiBase("/api/v1/pgi/score")).toBe(__apiBaseUrls.bi);
  });
  it("routes shared shell paths to BF-Server even though tests run in BI silo", () => {
    expect(resolveApiBase("/api/auth/me")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/users/me")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/crm/contacts")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/telephony/token")).toBe(__apiBaseUrls.bf);
    expect(resolveApiBase("/api/portal/lender-products")).toBe(__apiBaseUrls.bf);
  });
});
