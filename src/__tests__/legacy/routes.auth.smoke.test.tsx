// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { defaultHandlers } from "@/tests/msw/defaultHandlers";
import App from "@/App";
import { AuthProvider } from "@/auth/AuthContext";
import { portalApiRoutes } from "@/utils/routeAudit";
import { SiloProvider } from "@/context/SiloContext";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

const server = setupServer(
  http.get("*/api/health", () => HttpResponse.json({ status: "ok" })),
  http.get("*/api/_int/routes", () => HttpResponse.json({ routes: portalApiRoutes })),
  http.post("*/api/auth/otp/start", () =>
    new HttpResponse(null, {
      status: 204,
      headers: {
        "x-twilio-sid": "twilio-sid"
      }
    })
  ),
  http.post("*/api/auth/otp/verify", () =>
    HttpResponse.json({ accessToken: "access-token", refreshToken: "refresh-token" })
  ),
  http.get("*/api/lenders", () => HttpResponse.json({ items: [] })),
  ...defaultHandlers
);

const renderApp = (initialRoute: string) => {
  window.history.pushState({}, "", initialRoute);
  return render(
    <AuthProvider>
      <SiloProvider>
        <App />
      </SiloProvider>
    </AuthProvider>
  );
};

describe("portal auth routing smoke tests", () => {
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

  it("redirects unauthenticated users from / to /login", async () => {
    window.__TEST_AUTH__ = { isAuthenticated: false, role: "Staff" };
    server.use(http.get("*/api/auth/me", () => new HttpResponse(null, { status: 401 })));

    renderApp("/");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });

    expect(await screen.findByRole("heading", { name: /staff login/i })).toBeInTheDocument();
  });

  it("allows authenticated users to access protected routes", async () => {
    window.__TEST_AUTH__ = { isAuthenticated: true, role: "Staff" };
    setStoredAccessToken("test-token");
    server.use(
      http.get("*/api/auth/me", () => HttpResponse.json({ id: "u1", role: "Staff" }))
    );

    renderApp("/");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard");
    });

    expect(await screen.findByText(/dashboard overview/i)).toBeInTheDocument();
  });

  it("navigates away from /login after OTP login", async () => {
    const user = userEvent.setup();
    window.__TEST_AUTH__ = { isAuthenticated: false, role: "Staff" };

    server.use(
      http.get("*/api/auth/me", () => HttpResponse.json({ id: "u1", role: "Staff" }))
    );

    renderApp("/login");

    await user.type(screen.getByLabelText(/phone number/i), "+15555550100");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    const otpInput = await screen.findByLabelText(/otp digit 1/i);
    await user.type(otpInput, "123456");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard");
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-probe")).toHaveTextContent("true");
    });
  });

  it("keeps authenticated users on /lenders after a hard refresh", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.__TEST_AUTH__ = { isAuthenticated: true, role: "Staff" };

    setStoredAccessToken("test-token");
    server.use(
      http.get("*/api/auth/me", () => HttpResponse.json({ id: "u1", role: "Staff" }))
    );

    renderApp("/lenders");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/lenders");
    });

    expect(await screen.findByText(/no lenders/i)).toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
