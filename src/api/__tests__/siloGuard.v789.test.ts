// BF_PORTAL_v789_SILO_GUARD - the live api client refuses another silo's data and reports it.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({ report: vi.fn(), silo: "BF" }));
vi.mock("@/utils/errorReporter", () => ({ reportError: h.report }));
vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "tok" }));
vi.mock("@/config/api", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/config/api")>();
  return { ...real, getActiveSilo: () => h.silo };
});

import { api, apiForSilo } from "@/api";
import { SiloMismatchError, findSiloMismatch, isCrossSiloPath } from "@/api/siloGuard";

function respond(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })));
}

beforeEach(() => { h.report.mockReset(); h.silo = "BF"; });
afterEach(() => vi.unstubAllGlobals());

describe("silo guard in the api client", () => {
  it("passes data from the current silo (case-insensitive)", async () => {
    respond({ data: [{ id: "c1", silo: "bf" }, { id: "c2", silo: "BF" }] });
    await expect(api.get("/api/crm/contacts")).resolves.toHaveLength(2);
    expect(h.report).not.toHaveBeenCalled();
  });

  it("throws SiloMismatchError and reports it when a row belongs to another silo", async () => {
    respond({ data: [{ id: "c1", silo: "BF" }, { id: "c2", silo: "BI" }] });
    const err = await api.get("/api/crm/contacts?q=x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SiloMismatchError);
    expect(err).toMatchObject({ path: "/api/crm/contacts", expected: "BF", received: "BI" });
    expect(h.report).toHaveBeenCalledWith("runtime", err, expect.objectContaining({ kind: "silo_mismatch" }));
  });

  it("checks a single record and rows nested in items", async () => {
    respond({ data: { id: "a1", silo: "SLF" } });
    await expect(api.get("/api/applications/a1")).rejects.toBeInstanceOf(SiloMismatchError);
    respond({ data: { items: [{ id: "x", silo: "BI" }], total: 1 } });
    await expect(api.get("/api/pipeline")).rejects.toBeInstanceOf(SiloMismatchError);
  });

  it("skips deliberately cross-silo endpoints", async () => {
    respond({ data: [{ id: "u1", silo: "BI" }, { id: "u2", silo: "SLF" }] });
    await expect(api.get("/api/users")).resolves.toHaveLength(2);
    respond({ data: { id: "me", silo: "BI" } });
    await expect(api.get("/api/auth/me")).resolves.toMatchObject({ silo: "BI" });
    expect(h.report).not.toHaveBeenCalled();
    for (const p of ["/api/admin/activity", "/api/reports/catalog", "/api/automations", "/api/team/channels"]) expect(isCrossSiloPath(p)).toBe(true);
    expect(isCrossSiloPath("/api/crm/contacts")).toBe(false);
    expect(isCrossSiloPath("/api/usersx")).toBe(false);
  });

  it("apiForSilo checks against the silo it asked for", async () => {
    respond({ data: [{ id: "c1", silo: "BI" }] });
    await expect(apiForSilo("BI").get("/api/crm/contacts")).resolves.toHaveLength(1);
    await expect(apiForSilo("BF").get("/api/crm/contacts")).rejects.toBeInstanceOf(SiloMismatchError);
  });

  it("ignores records without a silo", () => {
    expect(findSiloMismatch([{ id: 1 }, null, "x"], "BF")).toBeNull();
    expect(findSiloMismatch({ total: 3 }, "BF")).toBeNull();
  });
});
