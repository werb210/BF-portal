// BF_PORTAL_v789_INCREMENTAL_CONSENT - a feature's call asks for its permission when it is used.
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ ensure: vi.fn(), post: vi.fn() }));
vi.mock("@/auth/msal", () => ({ ensureO365Scopes: h.ensure }));
vi.mock("@/api", () => ({ api: { post: h.post } }));

import { withO365Scopes } from "@/api/o365Interceptor";

beforeEach(() => { h.ensure.mockReset(); h.post.mockReset(); });

describe("withO365Scopes", () => {
  it("tries the scope silently first and runs the call", async () => {
    h.ensure.mockResolvedValue(true);
    const call = vi.fn(async () => "ok");
    await expect(withO365Scopes(["Files.ReadWrite"], call)).resolves.toBe("ok");
    expect(h.ensure).toHaveBeenCalledWith(["Files.ReadWrite"], { interactive: false });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("on a click, a missing permission opens consent and retries once", async () => {
    h.ensure.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const call = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("x"), { status: 403, code: "onedrive_permission_needed" }))
      .mockResolvedValueOnce("saved");
    await expect(withO365Scopes(["Files.ReadWrite"], call, { interactive: true })).resolves.toBe("saved");
    expect(h.ensure).toHaveBeenLastCalledWith(["Files.ReadWrite"], { interactive: true });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("in the background it never opens consent", async () => {
    h.ensure.mockResolvedValue(false);
    const err = Object.assign(new Error("x"), { status: 412 });
    await expect(withO365Scopes(["Mail.ReadWrite"], vi.fn().mockRejectedValue(err))).rejects.toBe(err);
    expect(h.ensure).toHaveBeenCalledTimes(1);
  });

  it("other errors pass straight through", async () => {
    h.ensure.mockResolvedValue(true);
    const err = Object.assign(new Error("boom"), { status: 500 });
    await expect(withO365Scopes(["Mail.ReadWrite"], vi.fn().mockRejectedValue(err), { interactive: true })).rejects.toBe(err);
    expect(h.ensure).toHaveBeenCalledTimes(1);
  });
});
