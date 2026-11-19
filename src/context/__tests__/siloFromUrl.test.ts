// BF_PORTAL_SILO_FROM_URL_v1 / BF_PORTAL_DIALLER_ACTIVE_BUSINESS_v1
import { afterEach, describe, expect, it } from "vitest";
import { getActiveBusinessUnit, siloFromPath } from "../BusinessUnitContext";

afterEach(() => { window.sessionStorage.clear(); window.history.replaceState({}, "", "/"); });

describe("the address decides the business", () => {
  it("reads /silo/bi and /silo/slf, and nothing else", () => {
    expect(siloFromPath("/silo/bi/pipeline")).toBe("BI");
    expect(siloFromPath("/silo/SLF")).toBe("SLF");
    expect(siloFromPath("/silo/bf/dashboard")).toBe("BF");
    expect(siloFromPath("/silo/ks/crm")).toBeNull();
    expect(siloFromPath("/pipeline")).toBeNull();
    expect(siloFromPath("/silo/bix")).toBeNull();
  });
  it("a direct link to a BI page wins over the business stored from an earlier visit", () => {
    window.sessionStorage.setItem("staff-portal.business-unit", "BF");
    window.history.replaceState({}, "", "/silo/bi/crm");
    expect(getActiveBusinessUnit()).toBe("BI");
    window.history.replaceState({}, "", "/pipeline");
    expect(getActiveBusinessUnit()).toBe("BF");
  });
});
