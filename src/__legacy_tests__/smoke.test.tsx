// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "@/App";
import { AuthProvider } from "@/auth/AuthContext";
import LoginPage from "@/pages/login/LoginPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import LendersPage from "@/pages/lenders/LendersPage";
import { renderWithProviders } from "@/test/testUtils";
import { fetchLenders } from "@/api/lenders";

vi.mock("@/api/lenders", () => ({
  fetchLenders: vi.fn()
}));

const mockedFetchLenders = vi.mocked(fetchLenders);

const buildJsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });

const stubFetch = () => {
  const fetchSpy = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/health")) {
      return Promise.resolve(buildJsonResponse({ status: "ok" }));
    }
    if (url.includes("/users/me")) {
      return Promise.resolve(
        buildJsonResponse({
          firstName: "Jamie",
          lastName: "Rivera",
          email: "jamie@example.com",
          phone: "+15555550123"
        })
      );
    }
    return Promise.resolve(buildJsonResponse({}));
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
};

describe("smoke coverage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the app shell", async () => {
    stubFetch();
    window.history.pushState({}, "Login", "/login");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Staff Login")).toBeInTheDocument();
    });
  });

  it("renders the login page", () => {
    stubFetch();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Staff Login")).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone number/i)).toBeInTheDocument();
  });

  it("renders the settings page", async () => {
    stubFetch();
    renderWithProviders(
      <MemoryRouter initialEntries={["/settings/profile"]}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>,
      {
        auth: {
          user: { id: "u-1", name: "Admin User", email: "admin@example.com", role: "Admin" },
          authState: "authenticated",
          authStatus: "authenticated",
          rolesStatus: "resolved",
          authenticated: true,
          authReady: true
        }
      }
    );

    await waitFor(() => {
      expect(screen.getByText("My profile")).toBeInTheDocument();
    });
  });

  it("renders the lenders page", async () => {
    mockedFetchLenders.mockResolvedValueOnce([]);

    renderWithProviders(
      <MemoryRouter initialEntries={["/lenders"]}>
        <Routes>
          <Route path="/lenders" element={<LendersPage />} />
        </Routes>
      </MemoryRouter>,
      {
        auth: {
          user: { id: "u-1", name: "Admin User", email: "admin@example.com", role: "Admin" },
          authState: "authenticated",
          authStatus: "authenticated",
          rolesStatus: "resolved",
          authenticated: true,
          authReady: true
        }
      }
    );

    await waitFor(() => {
      expect(screen.getByText(/No lenders/i)).toBeInTheDocument();
    });
  });
});
