// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import apiClient from "@/api/httpClient";
import api from "@/api/client";
import authApi from "@/lib/api";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { loginWithOtp } from "@/services/auth";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { clearStoredAuth } from "@/services/token";

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
      onClick: () => void verifyOtp("+15555550100", "123456")
    },
    "Verify"
  );
};

describe("auth login", () => {
  const originalAdapter = authApi.defaults.adapter;
  const mockVerifyResponse = {
    ok: true,
    data: {
      token: "test-jwt-token",
      user: {
        id: "user-id",
        phone: "+15555555555",
        role: "Staff"
      },
      nextPath: "/portal"
    }
  };

  beforeEach(() => {
    adapter.mockClear();
    clearStoredAuth();
    localStorage.clear();
    sessionStorage.clear();
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

  it("OTP verification stores auth token and user from nested verify payload", async () => {
    const apiPostSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: mockVerifyResponse,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);

    const result = await loginWithOtp("+15555550100", "123456");

    expect(result.nextPath).toBe("/portal");
    expect(localStorage.getItem("bf_token")).toBe(mockVerifyResponse.data.token);

    window.history.replaceState({}, "", mockVerifyResponse.data.nextPath);
    expect(window.location.href).toContain("/portal");

    expect(apiPostSpy).toHaveBeenCalledWith(
      "/auth/otp/verify",
      {
        phone: "+15555550100",
        code: "123456"
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    apiPostSpy.mockRestore();
  });

  it("OTP verification accepts unwrapped verify payloads", async () => {
    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        token: "test-jwt-token",
        user: {
          id: "user-id",
          phone: "+15555555555",
          role: "Staff"
        },
        nextPath: "/portal"
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);

    const result = await loginWithOtp("+15555550100", "123456");
    expect(result.token).toBe("test-jwt-token");
    expect(result.user?.id).toBe("user-id");
  });

  it("retains existing adapter behavior", async () => {
    await apiClient.get("/example", { adapter, skipAuth: true } as any);
    expect(adapter).toHaveBeenCalledOnce();
  });

  it("hydrates user from /auth/me on reload", async () => {
    localStorage.setItem("bf_token", "test-token");
    const adapter = vi.fn(async (config) => ({
      data: {
        data: {
          user: {
            id: "1",
            email: "restored@example.com",
            role: "Admin"
          }
        }
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
  });

  it("hydrates user from unwrapped /auth/me payload on reload", async () => {
    localStorage.setItem("bf_token", "test-token");
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
  });

  it("verifyOtp triggers /auth/me and updates status", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: mockVerifyResponse,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);
    const adapter = vi.fn(async (config) => ({
      data: {
        data: {
          user: { id: "1", email: "demo@example.com", role: "Admin" }
        }
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    }));
    authApi.defaults.adapter = adapter;

    render(createElement(AuthProvider, null, createElement(TestVerifyAction), createElement(TestAuthState)));

    await act(async () => {
      screen.getByRole("button", { name: "Verify" }).click();
    });

    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(localStorage.getItem("bf_token")).toBe(mockVerifyResponse.data.token);
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
  });

  it("treats ok=true with null token as failed authentication", async () => {
    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          token: null,
          user: { id: "user-id", role: "Staff" }
        }
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);

    await expect(loginWithOtp("+15555550100", "123456")).rejects.toThrow("Invalid API response");
    expect(localStorage.getItem("bf_token")).toBeNull();
  });

  it("treats missing user as failed authentication", async () => {
    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          token: "test-jwt-token",
          user: null
        }
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {}
    } as any);

    await expect(loginWithOtp("+15555550100", "123456")).rejects.toThrow("Invalid API response");
  });
});
