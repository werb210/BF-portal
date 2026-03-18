// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "@/router/PrivateRoute";
import { AuthProvider } from "@/auth/AuthContext";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

const createJsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });

const renderRoutes = (initialEntry: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login</div>} />
          <Route
            path="/lenders"
            element={
              <PrivateRoute>
                <div>Protected</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );

beforeEach(() => {
  clearStoredAuth();
  window.__TEST_AUTH__ = { isAuthenticated: true, role: "Admin" };
});

afterEach(() => {
  clearStoredAuth();
  vi.unstubAllGlobals();
});

describe("lender route access", () => {
  it("redirects unauthenticated users to login", async () => {
    window.__TEST_AUTH__ = { isAuthenticated: false, role: "Admin" };
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchSpy);

    renderRoutes("/lenders");

    await waitFor(() => expect(screen.queryByText("Protected")).not.toBeInTheDocument());
  });

  it("allows authenticated users onto lender routes", async () => {
    setStoredAccessToken("test-token");
    const fetchSpy = vi.fn().mockResolvedValue(createJsonResponse({ id: "1", role: "Admin" }));
    vi.stubGlobal("fetch", fetchSpy);

    renderRoutes("/lenders");

    await waitFor(() => expect(screen.getByText("Protected")).toBeInTheDocument());
  });
});
