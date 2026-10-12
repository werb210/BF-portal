// BF_PORTAL_REFERRER_PORTAL_V2
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
// The add-referral modal offers three refer-to options (incl. start-up), shows the two
// message previews, formats the phone as it is typed, and "Save & add another" posts the
// referral (with the startup flag) then clears the form while keeping the modal open.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

import ReferrerPortal from "../ReferrerPortal";

// Field labels are siblings of their inputs (no htmlFor), so find the input next to the label.
function fieldInput(label: string): HTMLInputElement {
  const input = screen.getByText(label).parentElement?.querySelector("input");
  if (!input) throw new Error(`no input for ${label}`);
  return input;
}

async function openModal() {
  render(
    <MemoryRouter>
      <ReferrerPortal />
    </MemoryRouter>,
  );
  await waitFor(() => expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/pipeline", expect.anything()));
  fireEvent.click(screen.getByRole("button", { name: "+ Add referral" }));
}

describe("referrer portal v2", () => {
  beforeEach(() => {
    h.apiFn.mockReset();
    h.apiFn.mockImplementation(async (path: string) => {
      if (path === "/api/referrer/me") return { profile: { full_name: "Jane Referrer" } };
      if (path === "/api/referrer/pipeline") return { referrals: [] };
      return {};
    });
    sessionStorage.setItem("referrer_token", "tok");
  });

  it("has the three refer-to options incl start-up", async () => {
    await openModal();
    const funding = screen.getByLabelText("Funding") as HTMLInputElement;
    const pgi = screen.getByLabelText("Personal Guarantee Insurance") as HTMLInputElement;
    const startup = screen.getByLabelText(/^Start-up funding/) as HTMLInputElement;
    expect(funding.checked).toBe(true);
    expect(pgi.checked).toBe(false);
    expect(startup.checked).toBe(false);
    fireEvent.click(startup);
    expect(screen.getByText(/Start-up funding isn't open yet/)).toBeInTheDocument();
  });

  it("shows message previews + Save & add another + phone formatting + startup flag", async () => {
    await openModal();
    // MSG_PREVIEW - both versions are shown with their labels.
    expect(screen.getByText(/^Version A/)).toBeInTheDocument();
    expect(screen.getByText(/^Version B/)).toBeInTheDocument();

    fireEvent.change(fieldInput("First name"), { target: { value: "Ada" } });
    // formatPhone - digits become (XXX) XXX-XXXX while typing.
    fireEvent.change(fieldInput("Mobile phone"), { target: { value: "4035551234" } });
    expect(fieldInput("Mobile phone").value).toBe("(403) 555-1234");
    fireEvent.change(fieldInput("Mobile phone"), { target: { value: "403555" } });
    expect(fieldInput("Mobile phone").value).toBe("(403) 555");
    fireEvent.change(fieldInput("Mobile phone"), { target: { value: "4035551234" } });

    fireEvent.click(screen.getByLabelText(/^Start-up funding/));
    fireEvent.click(screen.getByRole("button", { name: "Save & add another" }));

    await waitFor(() =>
      expect(h.apiFn).toHaveBeenCalledWith("/api/referrer/add-referral", expect.objectContaining({ method: "POST" })),
    );
    const call = h.apiFn.mock.calls.find((c: unknown[]) => c[0] === "/api/referrer/add-referral");
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({ first_name: "Ada", phone: "(403) 555-1234", startup: true, silos: ["BF"], message: "A" });

    // Form cleared, modal still open for the next one.
    expect(await screen.findByText(/^Added/)).toBeInTheDocument();
    expect(fieldInput("First name").value).toBe("");
    expect(fieldInput("Mobile phone").value).toBe("");
    expect(screen.getByText("Add a referral")).toBeInTheDocument();
  });
});
