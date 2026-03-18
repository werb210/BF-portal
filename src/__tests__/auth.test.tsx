// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";
import api from "@/lib/api";

const createAuthAdapter = (user: unknown, status = 200) =>
  vi.fn(async (config) => ({
    data: { ok: true, data: { user } },
    status,
    statusText: status === 200 ? "OK" : "Unauthorized",
    headers: {},
    config
  }));

const TestAuthState = () => {
  const { authStatus, user, rolesStatus } = useAuth();
  return createElement(
    "div",
    null,
    createElement("span", { "data-testid": "status" }, `${authStatus}:${rolesStatus}`),
    createElement("span", { "data-testid": "email" }, user?.email ?? "")
  );
};

const TestSetAuth = () => {
  const { setAuth } = useAuth();
  return createElement(
    "button",
    {
      type: "button",
      onClick: () =>
        setAuth({
          id: "1",
          email: "demo@example.com",
          role: "Admin"
        })
    },
    "Set Auth"
  );
};

describe("token auth", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    clearStoredAuth();
  });

  afterEach(() => {
    clearStoredAuth();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    api.defaults.adapter = originalAdapter;
  });

  it("stores user after OTP verification flow", async () => {
    setStoredAccessToken("test-token");
    api.defaults.adapter = createAuthAdapter({ id: "1", email: "demo@example.com", role: "Admin" });

    render(
      <AuthProvider>
        <TestSetAuth />
        <TestAuthState />
      </AuthProvider>
    );

    screen.getByRole("button", { name: "Set Auth" }).click();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
    expect(screen.getByTestId("email")).toHaveTextContent("demo@example.com");
  });

  it("hydrates auth state from /auth/me", async () => {
    setStoredAccessToken("test-token");
    api.defaults.adapter = createAuthAdapter({ id: "2", email: "restored@example.com", role: "Staff" });

    render(
      <AuthProvider>
        <TestAuthState />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved")
    );
    expect(screen.getByTestId("email")).toHaveTextContent("restored@example.com");
  });
  it("settles unauthenticated on /auth/me 401 without bootstrap loop", async () => {
    setStoredAccessToken("expired-token");

    const adapter = createAuthAdapter(null, 401);
    api.defaults.adapter = adapter;

    render(
      <AuthProvider>
        <TestAuthState />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated:resolved")
    );

    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("email")).toHaveTextContent("");
  });

});
