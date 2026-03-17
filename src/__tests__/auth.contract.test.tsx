// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";
import api from "@/lib/api";

type DeferredResponse = {
  promise: Promise<unknown>;
  resolve: (value: { id: string; role: string }) => void;
};

const createDeferredResponse = (): DeferredResponse => {
  let resolve: (value: { id: string; role: string }) => void = () => undefined;
  const promise = new Promise<{ id: string; role: string }>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
};

const AuthStatusProbe = () => {
  const { authStatus, rolesStatus } = useAuth();
  return createElement("span", { "data-testid": "status" }, `${authStatus}:${rolesStatus}`);
};

describe("auth contract", () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    clearStoredAuth();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    api.defaults.adapter = originalAdapter;
  });

  it("sets loading immediately and resolves roles after /auth/me", async () => {
    clearStoredAuth();
    setStoredAccessToken("token");

    const deferred = createDeferredResponse();
    const adapter = vi.fn((config) =>
      deferred.promise.then((payload) => ({
        data: payload,
        status: 200,
        statusText: "OK",
        headers: {},
        config
      }))
    );
    api.defaults.adapter = adapter;

    render(
      <AuthProvider>
        <AuthStatusProbe />
      </AuthProvider>
    );

    expect(screen.getByTestId("status")).toHaveTextContent("loading:loading");

    deferred.resolve({ id: "1", role: "Staff" });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated:resolved");
    });
  });
});
