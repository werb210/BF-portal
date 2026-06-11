// BF_PORTAL_BLOCK_v210_STAFF_LOGIN_OTP_CONSISTENCY_v1
// Locks the OTP gold-spec contract on the staff login page. These tests
// are deliberately about visible-text and structural markers, not pixel
// values — the underlying Tailwind classes can be refactored as long as
// the spec strings remain visible to the user.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Stub the auth flow side-effect helpers — they touch localStorage which
// jsdom permits but we want zero side-effects in the test.
vi.mock("@/auth/otpFlow", () => ({
  clearOtpFlowState: vi.fn(),
  setOtpStartRequested: vi.fn(),
  setOtpStartSucceeded: vi.fn(),
}));
vi.mock("@/config/api", () => ({ API_BASE: "https://server.test" }));

import Login from "@/pages/Login";

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BLOCK_v210 — staff Login OTP consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the unified 'Mobile phone number' label", () => {
    renderLogin();
    expect(screen.getByLabelText(/mobile phone number/i)).toBeInTheDocument();
  });

  it("uses the unified placeholder (555) 000-0000", () => {
    renderLogin();
    const input = screen.getByTestId("phone-input") as HTMLInputElement;
    expect(input.getAttribute("placeholder")).toBe("(555) 000-0000");
  });

  it("uses the unified button label 'Send code →' in idle state", () => {
    renderLogin();
    expect(
      screen.getByRole("button", { name: /^send code →$/i }),
    ).toBeInTheDocument();
  });

  it("renders the gold-spec helper line below the button", () => {
    renderLogin();
    expect(
      screen.getByText(/we'll text you a one-time code to verify/i),
    ).toBeInTheDocument();
  });

  // BF_PORTAL_BLOCK_v831_OTP_TEST_FIX_FOR_v828 — v828 split the header to match
  // Verify.tsx: an <h1> "Boreal Group of Companies" plus a "Staff Portal" subtitle.
  it("keeps the staff-portal title as a hero above the card", () => {
    renderLogin();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /boreal group of companies/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/staff portal/i)).toBeInTheDocument();
  });

  it("preserves data-testid hooks for downstream e2e suites", () => {
    renderLogin();
    expect(screen.getByTestId("login-screen")).toBeInTheDocument();
    expect(screen.getByTestId("phone-input")).toBeInTheDocument();
    expect(screen.getByTestId("start-otp-button")).toBeInTheDocument();
  });

  it("renders no literal '&apos;' anywhere on the page", () => {
    const { container } = renderLogin();
    expect(container.innerHTML).not.toMatch(/&apos;/);
    // also covers any double-escape regression
    expect(container.textContent ?? "").not.toMatch(/&apos;/);
  });

  it("submit button is disabled until a valid NA-format phone is entered", () => {
    renderLogin();
    const btn = screen.getByTestId("start-otp-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const input = screen.getByTestId("phone-input");
    fireEvent.change(input, { target: { value: "5871234567" } });
    expect(btn.disabled).toBe(false);
  });
});
