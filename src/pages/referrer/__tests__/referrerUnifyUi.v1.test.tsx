// BF_PORTAL_REFERRER_UNIFY_UI_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
vi.mock("@/silos/bi/lender/BILenderManagement", () => ({ default: () => <div>bi-lender-management</div> }));
vi.mock("@/silos/bi/referrer/BIReferrerManagement", () => ({ default: () => <div>bi-referrer-management</div> }));

import ReferrerLoginPage from "../ReferrerLoginPage";
import ReferrerPortal from "../ReferrerPortal";
import BILender from "@/silos/bi/lender/BILender";

function fieldInput(label: string): HTMLInputElement {
  const input = screen.getByText(label).parentElement?.querySelector("input");
  if (!input) throw new Error(`no input for ${label}`);
  return input;
}

const verifyCalls = () => h.apiFn.mock.calls.filter((c: unknown[]) => c[0] === "/api/auth/otp/verify");

beforeEach(() => {
  h.apiFn.mockReset();
  sessionStorage.clear();
});

describe("referrer unify UI", () => {
  it("login does not auto-retry a failed code (loop fix)", async () => {
    h.apiFn.mockImplementation(async (path: string) => {
      if (path === "/api/auth/otp/verify") throw new Error("Invalid code");
      return {};
    });
    render(
      <MemoryRouter>
        <ReferrerLoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId("referrer-phone-input"), { target: { value: "4035551234" } });
    const codeInput = await screen.findByTestId("referrer-code-input", {}, { timeout: 3000 });
    fireEvent.change(codeInput, { target: { value: "123456" } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid code");
    // Give any re-fire loop time to show itself: the same code must be tried once only.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(verifyCalls()).toHaveLength(1);

    // A different code is still verified automatically.
    fireEvent.change(screen.getByTestId("referrer-code-input"), { target: { value: "654321" } });
    await waitFor(() => expect(verifyCalls()).toHaveLength(2));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(verifyCalls()).toHaveLength(2);
  });

  it("add-referral form has silo picker and message picker", async () => {
    sessionStorage.setItem("referrer_token", "tok");
    h.apiFn.mockImplementation(async (path: string) => (path === "/api/referrer/pipeline" ? { referrals: [] } : {}));
    render(
      <MemoryRouter>
        <ReferrerPortal />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add referral" }));
    fireEvent.change(fieldInput("First name"), { target: { value: "Ada" } });
    fireEvent.change(fieldInput("Last name"), { target: { value: "Lovelace" } });
    fireEvent.change(fieldInput("Business name (optional)"), { target: { value: "Engines Inc" } });
    fireEvent.change(fieldInput("Mobile phone"), { target: { value: "4035551234" } });
    // Silo picker: Funding (BF) is on by default; add PGI (BI).
    fireEvent.click(screen.getByLabelText("Personal Guarantee Insurance"));
    // Message picker: choose version B.
    fireEvent.click(screen.getByText(/^Version B/));
    fireEvent.click(screen.getByRole("button", { name: "Save referral" }));

    await waitFor(() =>
      expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/add-referral", expect.objectContaining({ method: "POST" })),
    );
    const call = h.apiFn.mock.calls.find((c: unknown[]) => c[0] === "/api/referrer/add-referral");
    expect(JSON.parse(call[1].body)).toEqual({
      first_name: "Ada",
      last_name: "Lovelace",
      business_name: "Engines Inc",
      email: "",
      phone: "(403) 555-1234",
      silos: ["BF", "BI"],
      startup: false,
      message: "B",
    });
    // Saved without "add another": the modal closes.
    await waitFor(() => expect(screen.queryByText("Add a referral")).toBeNull());
  });

  it("refuses to save with no refer-to option picked", async () => {
    sessionStorage.setItem("referrer_token", "tok");
    h.apiFn.mockImplementation(async (path: string) => (path === "/api/referrer/pipeline" ? { referrals: [] } : {}));
    render(
      <MemoryRouter>
        <ReferrerPortal />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add referral" }));
    fireEvent.change(fieldInput("First name"), { target: { value: "Ada" } });
    fireEvent.change(fieldInput("Mobile phone"), { target: { value: "4035551234" } });
    fireEvent.click(screen.getByLabelText("Funding"));
    fireEvent.click(screen.getByRole("button", { name: "Save referral" }));
    expect(screen.getByText(/Pick at least one option/)).toBeInTheDocument();
    expect(h.apiFn).not.toHaveBeenCalledWith("/api/referrer/add-referral", expect.anything());
  });

  it("BI lender page no longer renders the Referrers subtab", () => {
    render(<BILender />);
    expect(screen.getByText("bi-lender-management")).toBeInTheDocument();
    expect(screen.queryByText("bi-referrer-management")).toBeNull();
    expect(screen.queryByRole("tab", { name: /Referrers/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Referrers/ })).toBeNull();
  });
});
