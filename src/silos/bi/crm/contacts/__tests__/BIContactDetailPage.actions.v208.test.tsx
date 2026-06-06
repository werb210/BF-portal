// BF_PORTAL_BLOCK_v208_BI_CONTACT_DETAIL_ACTIONS_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.fn();
const openDialerMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: (...args: unknown[]) => openDialerMock(...args) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import BIContactDetailPage from "@/silos/bi/crm/contacts/BIContactDetailPage";

const baseContact = {
  id: "c1",
  full_name: "Jane Doe",
  email: "jane@example.com",
  phone_e164: "+14165551234",
  title: "CFO",
  tags: [],
  notes: "Met at conference.",
  outreach_status: "engaged",
  outreach_owner_id: "staff-1",
  outreach_updated_at: "2026-05-10T12:00:00Z",
  company_id: null,
  company_name: null,
  company_operating_name: null,
  created_at: "2026-05-01T12:00:00Z",
  updated_at: "2026-05-10T12:00:00Z",
  activity_count: 0,
};

function makeApi(opts: { contact?: any; smsResult?: any; patchResult?: any; throws?: Record<string, Error> } = {}) {
  return async (path: any, init?: any) => {
    const pathStr = typeof path === "string" ? path : String(path?.url ?? "");
    if (opts.throws?.[init?.method ?? "GET"]) throw opts.throws[init?.method ?? "GET"];
    if (pathStr.endsWith("/activity")) return { events: [] };
    if (init?.method === "PATCH") return opts.patchResult ?? { ok: true };
    if (init?.method === "DELETE") return { ok: true };
    if (init?.method === "POST" && (pathStr.endsWith("/sms") || pathStr === "/api/communications/sms"))
      return opts.smsResult ?? { ok: true, sid: "SM123" };
    return opts.contact ?? baseContact;
  };
}

function renderAtId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/silo/bi/crm/contacts/${id}`]}>
      <Routes>
        <Route path="/silo/bi/crm/contacts/:id" element={<BIContactDetailPage />} />
        <Route path="/silo/bi/crm" element={<div data-testid="bi-crm-landing" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BLOCK_v208 — Edit", () => {
  beforeEach(() => { apiMock.mockReset(); openDialerMock.mockReset(); });

  it("clicking Edit shows the form, clicking Cancel hides it", async () => {
    apiMock.mockImplementation(makeApi());
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTestId("bi-contact-edit-button"));
    expect(screen.getByTestId("bi-contact-edit-form")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByTestId("bi-contact-edit-form")).toBeNull();
  });

  it("PATCH is called only with changed fields", async () => {
    apiMock.mockImplementation(makeApi());
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTestId("bi-contact-edit-button"));
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "VP Finance" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      const patchCall = apiMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      // Body has ONLY title; full_name/email/phone untouched.
      expect(patchCall![1].body).toEqual({ title: "VP Finance" });
    });
  });

  it("clears a field when emptied (sends null)", async () => {
    apiMock.mockImplementation(makeApi());
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTestId("bi-contact-edit-button"));
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      const patchCall = apiMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(patchCall![1].body).toEqual({ title: null });
    });
  });

  it("surfaces server error", async () => {
    apiMock.mockImplementation(
      makeApi({ throws: { PATCH: new Error("invalid_email") } }),
    );
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTestId("bi-contact-edit-button"));
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "broken" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid_email/)).toBeInTheDocument(),
    );
  });
});

describe("BF_PORTAL_BLOCK_v208 — Delete", () => {
  beforeEach(() => {
    apiMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("DELETE fires after confirm and navigates back to /silo/bi/crm", async () => {
    apiMock.mockImplementation(makeApi());
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTestId("bi-contact-delete-button"));
    await waitFor(() => {
      const deleteCall = apiMock.mock.calls.find(
        ([, init]) => init?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByTestId("bi-crm-landing")).toBeInTheDocument();
    });
  });

  it("cancel confirm aborts the delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    apiMock.mockImplementation(makeApi());
    renderAtId("c1");
    await waitFor(() => screen.getByText("Jane Doe"));
    fireEvent.click(screen.getByTestId("bi-contact-delete-button"));
    await new Promise((r) => setTimeout(r, 0));
    const deleteCall = apiMock.mock.calls.find(
      ([, init]) => init?.method === "DELETE",
    );
    expect(deleteCall).toBeUndefined();
  });
});

// BF_PORTAL_BLOCK_v337_BI_ACTIONBAR_TESTS_v1 — the "Contact actions" (Call) and
// "Send SMS" describes were removed: v334 replaced BI's bespoke Call/SMS buttons with
// the shared ActionBar (which uses the shared CallPopup/SmsPopup). Those flows are now
// owned by the shared components; this file keeps the BI-specific Edit/Delete coverage.

