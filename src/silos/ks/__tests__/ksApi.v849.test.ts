// BF_PORTAL_v849_KS_SILO - KS-Ops client: BF token exchange, bearer calls, 401 swap-and-retry, access-denied errors.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authToken", () => ({ getAuthToken: () => "bf-portal-token-123" }));

import { clearKsToken, ensureKsToken, isKsAccessDenied, ksApi, KsOpsError, KS_OPS_DEFAULT_URL } from "../ksApi";

type Call = { url: string; init: RequestInit };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

let calls: Call[] = [];

function mockFetch(handler: (url: string, init: RequestInit, n: number) => Response) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init, calls.length);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const headersOf = (c: Call) => (c.init.headers ?? {}) as Record<string, string>;

beforeEach(() => {
  calls = [];
  clearKsToken();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KS-Ops client", () => {
  it("swaps the BF token for an ops token, then calls KS-Ops with it and no X-Silo header", async () => {
    let exchanges = 0;
    mockFetch((url) => {
      if (url.endsWith("/api/ops/auth/exchange")) {
        exchanges += 1;
        return json(200, { token: "ops-token-1", expires_in: 3600, user: { id: "u1", email: "todd@example.com", name: "Todd", role: "Admin" } });
      }
      return json(200, { licensees: [] });
    });
    await ksApi.licensees({ status: "active", q: "acme" });
    await ksApi.licensees();
    expect(exchanges).toBe(1);
    const ex = calls[0]!;
    expect(ex.url).toBe(`${KS_OPS_DEFAULT_URL}/api/ops/auth/exchange`);
    expect(ex.init.method).toBe("POST");
    expect(JSON.parse(String(ex.init.body))).toEqual({ bfToken: "bf-portal-token-123" });
    const list = calls[1]!;
    expect(list.url).toBe(`${KS_OPS_DEFAULT_URL}/api/ops/licensees?status=active&q=acme`);
    expect(headersOf(list).Authorization).toBe("Bearer ops-token-1");
    for (const c of calls) {
      expect(Object.keys(headersOf(c)).map((k) => k.toLowerCase())).not.toContain("x-silo");
      expect(c.url.startsWith(KS_OPS_DEFAULT_URL)).toBe(true);
    }
  });

  it("on a 401 it signs in again once and retries", async () => {
    let exchanges = 0;
    mockFetch((url, init) => {
      if (url.endsWith("/api/ops/auth/exchange")) {
        exchanges += 1;
        return json(200, { token: `ops-token-${exchanges}`, expires_in: 3600, user: null });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer ops-token-1" ? json(401, { error: "unauthorized" }) : json(200, { open_tickets: 3 });
    });
    const d = await ksApi.dashboard();
    expect(d.open_tickets).toBe(3);
    expect(exchanges).toBe(2);
    expect(headersOf(calls[calls.length - 1]!).Authorization).toBe("Bearer ops-token-2");
  });

  it("reports KS-Ops refusing the user (not on OPS_ADMIN_EMAILS) as access denied", async () => {
    mockFetch(() => json(403, { error: "not_allowed", message: "Your account is not on the Keystone operations list. Ask an owner to add you." }));
    const err = await ensureKsToken().catch((e) => e);
    expect(err).toBeInstanceOf(KsOpsError);
    expect(isKsAccessDenied(err)).toBe(true);
    expect((err as KsOpsError).message).toMatch(/not on the Keystone operations list/);
  });

  it("keeps form errors from KS-Ops", async () => {
    mockFetch((url) =>
      url.endsWith("/exchange")
        ? json(200, { token: "t", expires_in: 3600, user: null })
        : json(400, { errors: { seats: "The Pro plan needs at least 2 seats." } }),
    );
    const err = (await ksApi.updateLicensee("abc", { seats: 1 }).catch((e) => e)) as KsOpsError;
    expect(err.status).toBe(400);
    expect(err.fieldErrors.seats).toMatch(/at least 2 seats/);
    expect(err.message).toMatch(/at least 2 seats/);
    const patch = calls[1]!;
    expect(patch.init.method).toBe("PATCH");
    expect(JSON.parse(String(patch.init.body))).toEqual({ seats: 1 });
  });

  it("explains when KS-Ops cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const err = (await ensureKsToken().catch((e) => e)) as KsOpsError;
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/Could not reach Keystone operations/);
  });
});
