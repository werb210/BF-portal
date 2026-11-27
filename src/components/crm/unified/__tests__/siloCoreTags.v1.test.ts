// BF_PORTAL_SILO_CORE_TAGS_v1 - the View-by row offers the shared tags the silo's server lists, not a fixed list.
import { describe, expect, it } from "vitest";
import { staffTagOptions, type TagCatalogue } from "../crmUnifiedApi";

describe("staffTagOptions", () => {
  it("uses the server's shared tags when it sends them", () => {
    const cat = { core: [{ slug: "lender", label: "Lender", kind: "core" }, { slug: "broker", label: "Broker", kind: "core" }], custom: [], system: [], inUse: [] } as unknown as TagCatalogue;
    expect(staffTagOptions(cat).map((o) => o.slug)).toEqual(["lender", "broker"]);
  });
  it("falls back to the built-in list", () => {
    expect(staffTagOptions(null).map((o) => o.slug)).toContain("ar_credit_insurance");
  });
});
