import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Login from "@/pages/Login";
import Verify from "@/pages/Verify";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function renderAuthRoutes(initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/portal" element={<div>Dashboard</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("OTP auth flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("visiting /login shows centered phone entry", () => {
    renderAuthRoutes("/login");

    expect(screen.getByTestId("login-screen")).toHaveClass("items-center", "justify-center", "bg-white");
    expect(screen.getByTestId("phone-input")).toBeInTheDocument();
  });

  it("submitting phone calls OTP start and success navigates to /verify", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    renderAuthRoutes("/login");
    fireEvent.change(screen.getByTestId("phone-input"), { target: { value: "5878881837" } });
    fireEvent.click(screen.getByTestId("start-otp-button"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalled();
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toContain("/api/auth/otp/start");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ phone: "+15878881837" }),
      }),
    );

    await waitFor(() => expect(screen.getByTestId("location-path")).toHaveTextContent("/verify"));
    expect(screen.getByTestId("code-input")).toBeInTheDocument();
  });

  it("failed OTP start does not navigate to /verify", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));

    renderAuthRoutes("/login");
    fireEvent.change(screen.getByTestId("phone-input"), { target: { value: "+15878881837" } });
    fireEvent.click(screen.getByTestId("start-otp-button"));

    await waitFor(() => expect(screen.getByText(/Unable to start OTP/i)).toBeInTheDocument());
    expect(screen.getByTestId("location-path")).toHaveTextContent("/login");
  });

  it("visiting /verify without pending phone redirects to /login", async () => {
    renderAuthRoutes("/verify");

    await waitFor(() => expect(screen.getByTestId("location-path")).toHaveTextContent("/login"));
    expect(screen.getByTestId("phone-input")).toBeInTheDocument();
  });

  it("entering 6-digit code auto-verifies and success redirects to dashboard", async () => {
    sessionStorage.setItem(
      "otp_flow",
      JSON.stringify({ pendingPhone: "+15878881837", startRequested: true, startSucceeded: true }),
    );

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderAuthRoutes("/verify");
    fireEvent.change(screen.getByTestId("code-input"), { target: { value: "123456" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalled();
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toContain("/api/auth/otp/verify");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ phone: "+15878881837", code: "123456" }),
      }),
    );

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(localStorage.getItem("auth_token")).toBe("jwt-token");
  });

  it("failed verify remains on /verify, clears code, and shows an error", async () => {
    sessionStorage.setItem(
      "otp_flow",
      JSON.stringify({ pendingPhone: "+15878881837", startRequested: true, startSucceeded: true }),
    );

    vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));

    renderAuthRoutes("/verify");
    fireEvent.change(screen.getByTestId("code-input"), { target: { value: "123456" } });

    await waitFor(() => expect(screen.getByText(/Unable to verify code/i)).toBeInTheDocument());
    expect(screen.getByTestId("location-path")).toHaveTextContent(/\/verify/);
    expect(screen.getByTestId("code-input")).toHaveValue("");
  });
});
