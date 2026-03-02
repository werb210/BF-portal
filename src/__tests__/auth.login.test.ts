// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import apiClient from "@/api/httpClient";
import api from "@/api/client";
import authApi from "@/lib/api";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { verifyOtp } from "@/services/auth";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    redirectToLogin: vi.fn(),
    redirectToDashboard: vi.fn()
  };
});

const adapter = vi.fn(async (config) => ({
  data: {},
  status: 200,
  statusText: "OK",
  headers: {},
  config
}));

const TestAuthState = () => {
  const { authStatus, user, rolesStatus } = useAuth();
  return createElement(
    "div",
    null,
    createElement("span", { "data-testid": "status" }, `${authStatus}:${rolesStatus}`),
    createElement("span", { "data-testid": "user" }, user?.email ?? "")
  );
};

const TestVerifyAction = () => {
  const { verifyOtp } = useAuth();

  return createElement(
    "button",
    {
      type: "button",
      onClick: () => void verifyOtp({ code: "123456", phone: "+15555550100" })
    },
    "Verify"
  );
};

describe("auth login", () => {
  const originalAdapter = authApi.defaults.adapter;

  beforeEach(() => {
    adapter.mockClear();
    clearStoredAuth();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    authApi.defaults.adapter = originalAdapter;
  });

  it("OTP start omits Idempotency-Key", async () => {
    const startAdapter = vi.fn(async (config) => ({
      data: {
        requestId: "req-1"
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));

    const response = await api.post<{ requestId?: string }>(
      "/auth/otp/start",
      { phone: "+15555550100" },
      { adapter: startAdapter } as any
    );

    expect(startAdapter).toHaveBeenCalledOnce();
    const passedConfig = startAdapter.mock.calls[0][0];
    const idempotencyKey =
      passedConfig?.headers?.["Idempotency-Key"] ?? passedConfig?.headers?.get?.("Idempotency-Key");
    expect(idempotencyKey).toBeUndefined();
    expect(response.data.requestId).toBe("req-1");
  });

  it("OTP verification returns tokens", async () => {
    const apiPostSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: { accessToken: "access", refreshToken: "refresh" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);

    await expect(verifyOtp({ phone: "+15555550100", code: "123456" })).resolves.toEqual({
      accessToken: "access",
      refreshToken: "refresh"
    });

    expect(apiPostSpy).toHaveBeenCalledWith(
      "/auth/otp/verify",
      {
        phone: "+15555550100",
        code: "123456"
      },
      { skipAuth: true }
    );
    apiPostSpy.mockRestore();
  });

  it("retains existing adapter behavior", async () => {
    await apiClient.get("/example", { adapter, skipAuth: true } as any);
    expect(adapter).toHaveBeenCalledOnce();
  });

  it("hydrates user from /api/auth/me on reload", async () => {
    setStoredAccessToken("test-token");
    const adapter = vi.fn(async (config) => ({
      data: {
        id: "1",
        email: "restored@example.com",
        role: "Admin"
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));
    authApi.defaults.adapter = adapter;

    render(createElement(AuthProvider, null, createElement(TestAuthState)));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
    expect(screen.getByTestId("user")).toHaveTextContent("restored@example.com");
    expect(adapter).toHaveBeenCalled();
    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig.headers?.Authorization).toBe("Bearer test-token");
    expect(passedConfig.withCredentials).not.toBe(true);
  });

  it("verifyOtp triggers /api/auth/me and updates status", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: { accessToken: "access", refreshToken: "refresh" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);
    const adapter = vi.fn(async (config) => ({
      data: { id: "1", email: "demo@example.com", role: "Admin" },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));
    authApi.defaults.adapter = adapter;

    render(createElement(AuthProvider, null, createElement(TestVerifyAction), createElement(TestAuthState)));

    screen.getByRole("button", { name: "Verify" }).click();

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    await waitFor(() => expect(adapter).toHaveBeenCalled());
    const passedConfig = adapter.mock.calls[0][0];
    expect(passedConfig.headers?.Authorization).toBe("Bearer access");
    expect(passedConfig.withCredentials).not.toBe(true);
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
  });
});
