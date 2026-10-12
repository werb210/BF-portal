// BF_PORTAL_v789_BI_COMPANY_ACTIVITY - the BI company page has the shared ActionBar on BI-Server and
// lists the company's activity.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn().mockResolvedValue({});
  apiFn.post = vi.fn().mockResolvedValue({});
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));

import BICompanyDetailPage from "@/silos/bi/crm/companies/BICompanyDetailPage";

const detail = {
  company: {
    id: "co1", legal_name: "Acme Inc", operating_name: null, business_number: null, address_line1: null, city: null,
    province: null, postal_code: null, industry: null, created_at: "2026-05-01T12:00:00Z", contact_count: 0, application_count: 0,
  },
  contacts: [],
  applications: [],
};

beforeEach(() => {
  h.apiFn.mockReset();
  h.apiFn.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (init?.method === "POST") return { ok: true };
    if (path === "/api/v1/bi/crm/companies/co1/activity") {
      return { events: [{ id: "a1", event_type: "meeting", body: "Annual review", meta: { title: "Q3 check-in" }, actor_name: "Andrew", created_at: "2026-05-02T10:00:00Z" }] };
    }
    if (path === "/api/v1/bi/crm/companies/co1") return detail;
    return {};
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/silo/bi/crm/companies/co1"]}>
      <Routes>
        <Route path="/silo/bi/crm/companies/:id" element={<BICompanyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BI company activity (item 89)", () => {
  it("lists the company's activity from BI-Server", async () => {
    renderPage();
    const list = await screen.findByTestId("bi-company-activity");
    await waitFor(() => expect(within(list).getByText("Q3 check-in")).toBeInTheDocument());
    expect(within(list).getByText("Annual review")).toBeInTheDocument();
    expect(within(list).getByText("Andrew")).toBeInTheDocument();
  });

  it("a note from the ActionBar posts to the company activity path and reloads the list", async () => {
    renderPage();
    await screen.findByText("Acme Inc");
    expect(screen.getByTestId("bi-company-edit-button")).toBeInTheDocument();
    expect(screen.getByTestId("bi-company-delete-button")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    fireEvent.change(screen.getByPlaceholderText(/leave a note/i), { target: { value: "Signed the broker agreement" } });
    fireEvent.click(screen.getByRole("button", { name: "Create note" }));
    await waitFor(() => {
      const post = h.apiFn.mock.calls.find((c: any[]) => c[1]?.method === "POST");
      expect(post?.[0]).toBe("/api/v1/bi/crm/companies/co1/activity");
      expect(post?.[1].body).toEqual({ event_type: "note", body: "Signed the broker agreement", outcome: null, meta: {} });
    });
    await waitFor(() => {
      const gets = h.apiFn.mock.calls.filter((c: any[]) => c[0] === "/api/v1/bi/crm/companies/co1/activity" && !c[1]);
      expect(gets.length).toBeGreaterThanOrEqual(2);
    });
    const all = h.apiFn.mock.calls.map((c: any[]) => String(c[0]));
    expect(all.some((p: string) => p.startsWith("/api/crm/"))).toBe(false);
  });
});
