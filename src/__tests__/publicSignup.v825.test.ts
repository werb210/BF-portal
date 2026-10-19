// BF_PORTAL_v825_PUBLIC_SIGNUP - someone with no account can send the referrer / broker sign-up form.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rawApiFetch } from "@/api";

const ok = () => new Response(JSON.stringify({ status: "ok", data: { referrerId: "r1" } }), { status: 200, headers: { "Content-Type": "application/json" } });

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("public sign-up requests are sent without a staff sign-in", () => {
  it.each(["/api/referrer/signup", "/api/referrer/signup/complete"])("%s", async (path) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok());
    await rawApiFetch(path, { method: "POST", body: JSON.stringify({ full_name: "Anthony Allen", kind: "broker" }) });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("other paths still need a sign-in", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(rawApiFetch("/api/referrer/me")).rejects.toThrow("API_ERROR");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
