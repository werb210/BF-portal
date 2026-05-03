import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/api", () => ({
  api: { get: vi.fn() },
}));

import { api } from "@/api";
import { fetchLenderProducts } from "../lenders";

describe("BF_PORTAL_BLOCK_v86 — server-short → portal-long category map", () => {
  beforeEach(() => vi.mocked(api.get).mockReset());

  it.each([
    ["TERM", "TERM_LOAN"],
    ["LOC", "LINE_OF_CREDIT"],
    ["EQUIPMENT", "EQUIPMENT_FINANCE"],
    ["FACTORING", "FACTORING"],
    ["PO", "PURCHASE_ORDER_FINANCE"],
    ["MCA", "MERCHANT_CASH_ADVANCE"],
    ["ABL", "ASSET_BASED_LENDING"],
    ["SBA", "SBA_GOVERNMENT"],
    ["STARTUP", "STARTUP_CAPITAL"],
  ])("server '%s' → portal '%s'", async (serverCat, portalCat) => {
    vi.mocked(api.get).mockResolvedValueOnce([
      { id: "p1", lender_id: "L1", name: "Example", category: serverCat, country: "CA", active: true },
    ]);
    const products = await fetchLenderProducts();
    expect(products[0]?.category).toBe(portalCat);
  });
});
