// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useEffect } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { defaultHandlers } from "@/tests/msw/defaultHandlers";
import { AuthContext, type AuthContextValue, AuthProvider } from "@/auth/AuthContext";
import LoginPage from "@/pages/login/LoginPage";
import RequireAuth from "@/routes/RequireAuth";
import api from "@/api/client";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const server = setupServer(...defaultHandlers);

describe("auth routing contract", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
    clearStoredAuth();
    cleanup();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it("redirects authenticated users away from /login", async () => {
    setStoredAccessToken("test-token");
    server.use(
      http.get("*/api/auth/me", () =>
        HttpResponse.json({ id: "u1", role: "Staff" }, { status: 200 })
      )
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    });

    expect(screen.queryByRole("heading", { name: /staff login/i })).not.toBeInTheDocument();
  });

  it("blocks unauthenticated users from private routes without firing API calls", async () => {
    const lendersSpy = vi.fn();
    server.use(
      http.get("*/api/auth/me", () => new HttpResponse(null, { status: 401 })),
      http.get("http://localhost/api/lenders", () => {
        lendersSpy();
        return HttpResponse.json({ items: [] });
      })
    );

    const ProtectedCallsApi = () => {
      useEffect(() => {
        void api.get("/lenders");
      }, []);
      return <div>Private Lenders</div>;
    };

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/lenders"]}>
          <Routes>
            <Route
              path="/lenders"
              element={
                <RequireAuth>
                  <ProtectedCallsApi />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });

    expect(lendersSpy).not.toHaveBeenCalled();
  });

  it("renders protected routes when authenticated and avoids redirects", () => {
    const authValue: AuthContextValue = {
      authState: "authenticated",
      authStatus: "authenticated",
      rolesStatus: "resolved",
      user: { id: "u1", role: "Staff", email: "staff@example.com" },
      accessToken: null,
      error: null,
      authenticated: true,
      isAuthenticated: true,
      authReady: true,
      isHydratingSession: false,
      pendingPhoneNumber: null,
      startOtp: async () => true,
      verifyOtp: async () => true,
      login: async () => undefined,
      setAuth: () => undefined,
      setUser: () => undefined,
      setAuthenticated: () => undefined,
      setAuthState: () => undefined,
      clearAuth: () => undefined,
      refreshUser: async () => false,
      logout: async () => undefined
    };

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <div>Home</div>
                </RequireAuth>
              }
            />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("does not redirect to /login after a 401 response", async () => {
    setStoredAccessToken("test-token");
    let callCount = 0;
    server.use(
      http.get("http://localhost/api/auth/me", () =>
        HttpResponse.json({ id: "u1", role: "Staff" }, { status: 200 })
      ),
      http.options("http://localhost/api/secure", () => new HttpResponse(null, { status: 204 })),
      http.get("http://localhost/api/secure", () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        return HttpResponse.json({ ok: true });
      })
    );

    window.history.pushState({}, "", "/lenders");

    let firstStatus: number | undefined;
    try {
      const response = await api.get("/secure");
      firstStatus = response.status;
    } catch (error) {
      firstStatus = (error as { status?: number }).status;
    }
    expect(firstStatus).toBe(401);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/lenders");
    });

    let secondStatus: number | undefined;
    try {
      await api.get("/secure");
      secondStatus = 200;
    } catch (error) {
      secondStatus = (error as { status?: number }).status;
    }
    expect(secondStatus).toBe(401);
    expect(window.location.pathname).toBe("/lenders");
  });
});
