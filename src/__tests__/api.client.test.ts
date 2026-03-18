import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/api/httpClient";
import { ApiError } from "@/api/http";
import { redirectToLogin } from "@/services/api";
import { buildRequestUrl } from "@/utils/apiLogging";
import { registerAuthFailureHandler } from "@/auth/authEvents";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    redirectToLogin: vi.fn()
  };
});

describe("api client auth handling", () => {
  beforeEach(() => {
    clearStoredAuth();
  });

  it("attaches auth headers when token exists", async () => {
    setStoredAccessToken("test-token");
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await apiClient.get("/example", { adapter } as any);

    expect(adapter).toHaveBeenCalledOnce();
    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig?.headers?.Authorization).toBe("Bearer test-token");
    expect(buildRequestUrl(passedConfig ?? {})).toMatch(/\/example$/);
  });

  it("adds an idempotency key to write requests", async () => {
    setStoredAccessToken("test-token");
    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await apiClient.post("/example", { name: "test" }, { adapter } as any);

    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig?.headers?.["Idempotency-Key"]).toBeTruthy();
  });

  it("reports missing tokens without redirecting", async () => {
    const failureHandler = vi.fn();
    const unregister = registerAuthFailureHandler(failureHandler);

    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    await expect(apiClient.get("/secure", { adapter } as any)).rejects.toBeInstanceOf(ApiError);

    expect(failureHandler).toHaveBeenCalledWith("missing-token");
    expect(redirectToLogin).not.toHaveBeenCalled();
    unregister();
  });

  it("reports unauthorized responses without redirecting", async () => {
    setStoredAccessToken("test-token");
    const failureHandler = vi.fn();
    const unregister = registerAuthFailureHandler(failureHandler);

    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config
    }));

    await expect(apiClient.get("/secure", { adapter } as any)).rejects.toBeInstanceOf(ApiError);

    expect(failureHandler).toHaveBeenCalledWith("unauthorized");
    expect(redirectToLogin).not.toHaveBeenCalled();
    unregister();
  });
});
