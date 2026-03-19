import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import { clearToken, setToken } from "@/lib/auth";

describe("api client auth headers", () => {
  beforeEach(() => {
    localStorage.clear();
    clearToken();
  });

  it("does not send authorization header for otp start/verify", async () => {
    setToken("staff-token");

    const adapter = vi.fn(async (config) => ({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await api.post("/auth/otp/start", { phone: "+15555550100" }, { adapter } as any);
    await api.post("/api/auth/otp/verify", { phone: "+15555550100", code: "123456" }, { adapter } as any);

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter.mock.calls[0][0]?.headers?.Authorization).toBeUndefined();
    expect(adapter.mock.calls[1][0]?.headers?.Authorization).toBeUndefined();
  });

  it("does not send authorization header when token is absent", async () => {
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await api.get("/dashboard", { adapter } as any);

    expect(adapter.mock.calls[0][0]?.headers?.Authorization).toBeUndefined();
  });

  it("sends authorization header for protected endpoints when token exists", async () => {
    setToken("staff-token");

    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await api.get("/dashboard", { adapter } as any);

    expect(adapter.mock.calls[0][0]?.headers?.Authorization).toBe("Bearer staff-token");
  });
});
