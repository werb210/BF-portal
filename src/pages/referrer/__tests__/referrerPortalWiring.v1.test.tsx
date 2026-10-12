// REFERRER_BF_WIRING_v1 - the BF referrer portal must call BF-Server endpoints
// (no /v1/, no BI paths) and group referrals by BF pipeline stages, not the
// insurance PGI stages the scaffold shipped with.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));

import ReferrerPortal from "../ReferrerPortal";
import ReferrerProfilePage from "../ReferrerProfilePage";
import ReferrerLoginPage from "../ReferrerLoginPage";

const BF_STAGES = ["New", "Requires Docs", "In Review", "Off to Lender", "Offer", "Funded", "Rejected"];

function calledPaths(): string[] {
  return [...h.apiFn.mock.calls, ...h.apiFn.post.mock.calls, ...h.apiFn.get.mock.calls].map((c: unknown[]) => String(c[0]));
}

function fieldInput(label: string): HTMLInputElement {
  const input = screen.getByText(label).parentElement?.querySelector("input");
  if (!input) throw new Error(`no input for ${label}`);
  return input;
}

const PROFILE = {
  full_name: "Jane Referrer",
  email: "jane@example.com",
  phone: "+14035551234",
  street: "1 Main St",
  city: "Calgary",
  province: "AB",
  postal_code: "T2P 1A1",
  company_name: "Jane Co",
  etransfer_email: "pay@example.com",
};

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.mockImplementation(async (path: string) => {
    if (path === "/api/referrer/me") return { status: "ok", profile: PROFILE };
    if (path === "/api/referrer/pipeline") return { referrals: [] };
    if (path === "/api/auth/otp/verify") return { token: "tok", user: { id: "u1", name: null, email: null, phone: "+14035551234", userType: "referrer" }, profileComplete: true };
    return {};
  });
  sessionStorage.clear();
});

describe("referrer portal endpoints", () => {
  it("calls BF-Server referrer routes, not the dead BI paths", async () => {
    sessionStorage.setItem("referrer_token", "tok");
    const { unmount } = render(
      <MemoryRouter>
        <ReferrerPortal />
      </MemoryRouter>,
    );
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/pipeline", expect.anything()));

    fireEvent.click(screen.getByRole("button", { name: "+ Add referral" }));
    fireEvent.change(fieldInput("First name"), { target: { value: "Ada" } });
    fireEvent.change(fieldInput("Mobile phone"), { target: { value: "4035551234" } });
    fireEvent.click(screen.getByRole("button", { name: "Save referral" }));
    await waitFor(() =>
      expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/add-referral", expect.objectContaining({ method: "POST" })),
    );
    unmount();

    render(
      <MemoryRouter>
        <ReferrerProfilePage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByPlaceholderText("Full name")).toHaveValue("Jane Referrer"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/profile", expect.objectContaining({ method: "POST" })),
    );

    expect(calledPaths().some((p) => p.includes("/api/v1/bi/"))).toBe(false);
    expect(calledPaths().some((p) => p.includes("/v1/"))).toBe(false);
  });

  it("sends userType:referrer on both otp start and verify", async () => {
    render(
      <MemoryRouter initialEntries={["/referrer/login"]}>
        <Routes>
          <Route path="/referrer/login" element={<ReferrerLoginPage />} />
          <Route path="/referrer" element={<div>portal home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId("referrer-phone-input"), { target: { value: "4035551234" } });
    // Auto-sends after a short debounce.
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/auth/otp/start", expect.anything()), { timeout: 3000 });
    fireEvent.change(await screen.findByTestId("referrer-code-input"), { target: { value: "123456" } });
    expect(await screen.findByText("portal home")).toBeInTheDocument();

    const bodyOf = (path: string) => {
      const call = h.apiFn.mock.calls.find((c: unknown[]) => c[0] === path);
      return JSON.parse(call[1].body);
    };
    expect(bodyOf("/api/auth/otp/start")).toEqual({ phone: "+14035551234", userType: "referrer" });
    expect(bodyOf("/api/auth/otp/verify")).toEqual({ phone: "+14035551234", code: "123456", userType: "referrer" });
  });
});

describe("referrer portal stages", () => {
  it("uses BF pipeline stages, not insurance PGI stages", async () => {
    sessionStorage.setItem("referrer_token", "tok");
    render(
      <MemoryRouter>
        <ReferrerPortal />
      </MemoryRouter>,
    );
    await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/pipeline", expect.anything()));
    // Exactly one empty column per BF stage, in pipeline order.
    const empties = await screen.findAllByText("No referrals here");
    expect(empties).toHaveLength(BF_STAGES.length);
    const headers = empties.map((e) => e.parentElement?.previousElementSibling?.firstChild?.textContent?.trim());
    expect(headers).toEqual(BF_STAGES);
    // Insurance PGI stage names are not columns.
    for (const pgi of ["Quoted", "Bound", "Underwriting", "Policy Issued"]) {
      expect(screen.queryByText(pgi)).toBeNull();
    }
  });
});
