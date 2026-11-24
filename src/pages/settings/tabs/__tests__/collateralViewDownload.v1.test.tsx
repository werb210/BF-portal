// BF_PORTAL_v_COLLATERAL_VIEW_DOWNLOAD
import { describe, expect, it, vi } from "vitest";
import { collateralBlob } from "../CollateralSettings";

describe("collateral file", () => {
  it("fetches the PDF with the staff token", async () => {
    localStorage.setItem("auth_token", "tok");
    const fetchImpl = vi.fn(async () => new Response(new Blob(["%PDF"], { type: "application/pdf" }), { status: 200 }));
    const b = await collateralBlob("a 1", fetchImpl as any);
    expect(b.size).toBeGreaterThan(0);
    const [url, init] = fetchImpl.mock.calls[0] as any[];
    expect(url).toMatch(/\/api\/collateral\/a%201\/file$/);
    expect(init.headers.Authorization).toBe("Bearer tok");
  });
  it("says when the file is missing", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 404 }));
    await expect(collateralBlob("x", fetchImpl as any)).rejects.toThrow("That file is missing.");
  });
});
