// BF_PORTAL_REFERRER_STAGE_MAP_v1 / BF_PORTAL_REFERRER_BRAND_HEADER_v1 / BF_PORTAL_REFERRER_PROFILE_PARITY_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import ReferrerPortalLayout from "../ReferrerPortalLayout";
import ReferrerProfilePage from "../ReferrerProfilePage";

// Every real server pipeline_state and the board column it must land in.
const EXPECTED: Array<[string, string]> = [
  ["Received", "New"],
  ["In Review", "In Review"],
  ["Documents Required", "Requires Docs"],
  ["Additional Steps Required", "Requires Docs"],
  ["Off to Lender", "Off to Lender"],
  ["Offer", "Offer"],
  ["Accepted", "Funded"],
  ["Rejected", "Rejected"],
];

function referral(state: string | null, i: number) {
  return {
    id: `r${i}`,
    full_name: `Client ${state ?? "none"}`,
    company_name: null,
    email: null,
    phone_e164: "+14035550000",
    application_id: state ? `a${i}` : null,
    application_stage: state,
    created_at: new Date().toISOString(),
  };
}

// A board column: the parent of the header that reads "<label> <count>".
function column(label: string): HTMLElement {
  const header = screen.getAllByText(label).find((el) => el.querySelector("span") && el.firstChild?.textContent?.trim() === label);
  const col = header?.parentElement;
  if (!col) throw new Error(`no column ${label}`);
  return col;
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
  sessionStorage.clear();
  sessionStorage.setItem("referrer_token", "tok");
});

describe("referrer portal - launch readiness", () => {
  it("maps every real server pipeline_state to a board column", async () => {
    const referrals = [...EXPECTED.map(([state], i) => referral(state, i)), referral(null, 99), referral("Something Odd", 100)];
    h.apiFn.mockImplementation(async (path: string) => (path === "/api/referrer/pipeline" ? { referrals } : {}));
    render(
      <MemoryRouter>
        <ReferrerPortal />
      </MemoryRouter>,
    );
    await screen.findByText("Client Received");
    for (const [state, col] of EXPECTED) {
      expect(within(column(col)).getByText(`Client ${state}`)).toBeInTheDocument();
    }
    // No application yet, or an unknown state, sits in New.
    expect(within(column("New")).getByText("Client none")).toBeInTheDocument();
    expect(within(column("New")).getByText("Client Something Odd")).toBeInTheDocument();
    expect(within(column("Requires Docs")).getAllByText(/^Client /)).toHaveLength(2);
  });

  it("treats Accepted as Funded so the Funded column populates", async () => {
    h.apiFn.mockImplementation(async (path: string) =>
      path === "/api/referrer/pipeline" ? { referrals: [referral("Accepted", 1)] } : {},
    );
    render(
      <MemoryRouter>
        <ReferrerPortal />
      </MemoryRouter>,
    );
    await screen.findByText("Client Accepted");
    const funded = column("Funded");
    expect(within(funded).getByText("Client Accepted")).toBeInTheDocument();
    expect(within(funded).getByText(/^Funded . commission earned$/)).toBeInTheDocument();
    expect(funded.querySelector("span")?.textContent).toBe("1");
  });

  it("carries the brand header", async () => {
    h.apiFn.mockImplementation(async (path: string) => (path === "/api/referrer/pipeline" ? { referrals: [] } : {}));
    render(
      <MemoryRouter initialEntries={["/referrer"]}>
        <Routes>
          <Route path="/referrer/*" element={<ReferrerPortalLayout />} />
        </Routes>
      </MemoryRouter>,
    );
    const banner = screen.getByRole("banner");
    expect(within(banner).getByText("Boreal Group of Companies")).toBeInTheDocument();
    expect(within(banner).getByAltText("Boreal")).toBeInTheDocument();
    expect(await screen.findByText("My Referrals")).toBeInTheDocument();
  });

  it("edit-my-info mirrors the signup field set 1:1 and reads the /me profile envelope", async () => {
    h.apiFn.mockImplementation(async (path: string) =>
      path === "/api/referrer/me" ? { status: "ok", profile: PROFILE } : {},
    );
    render(
      <MemoryRouter>
        <ReferrerProfilePage />
      </MemoryRouter>,
    );
    // Prefilled from me.profile (not the bare root).
    await waitFor(() => expect(screen.getByPlaceholderText("Full name")).toHaveValue("Jane Referrer"));
    expect(screen.getByPlaceholderText("Email")).toHaveValue("jane@example.com");
    expect(screen.getByPlaceholderText("Mobile phone")).toHaveValue("+14035551234");
    expect(screen.getByPlaceholderText("Street address")).toHaveValue("1 Main St");
    expect(screen.getByPlaceholderText("City")).toHaveValue("Calgary");
    expect(screen.getByPlaceholderText("Province / State")).toHaveValue("AB");
    expect(screen.getByPlaceholderText("Postal / ZIP")).toHaveValue("T2P 1A1");
    expect(screen.getByPlaceholderText("Company name")).toHaveValue("Jane Co");
    expect(screen.getByPlaceholderText("e-Transfer email")).toHaveValue("pay@example.com");
  });
});
