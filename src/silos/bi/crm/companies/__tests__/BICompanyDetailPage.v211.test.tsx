// BF_PORTAL_BLOCK_v211_BI_COMPANY_DETAIL_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiMock = vi.fn();
// BF_PORTAL_v856_CRM_UNIFY - the shared company panels (People, details, tags, AI summary) read BI-Server through
// api.get(); everything else on the page still calls api() directly.
const getMock = vi.fn(async (_path: string): Promise<unknown> => ({}));
vi.mock("@/api", () => ({
  api: Object.assign((...args: unknown[]) => apiMock(...args), {
    get: (path: string) => getMock(path),
    post: async () => ({}),
    patch: async () => ({}),
  }),
}));

import BICompanyDetailPage from "@/silos/bi/crm/companies/BICompanyDetailPage";

const baseCompany = {
  id: "co-1",
  legal_name: "Acme Inc",
  operating_name: "Acme",
  business_number: "123456789",
  address_line1: "1 Main St",
  city: "Calgary",
  province: "AB",
  postal_code: "T2P 0X0",
  industry: "Software",
  created_at: "2026-05-01T12:00:00Z",
  contact_count: 2,
  application_count: 1,
};

function detailFixture(over: Partial<Record<string, unknown>> = {}) {
  return {
    company: { ...baseCompany, ...(over.company as object || {}) },
    contacts: (over.contacts as any) ?? [
      {
        id: "c1",
        full_name: "Jane Doe",
        email: "jane@example.com",
        phone_e164: "+14165551234",
        title: "CFO",
        outreach_status: "engaged",
        created_at: "2026-05-01T12:00:00Z",
      },
      {
        id: "c2",
        full_name: "Bob Lee",
        email: null,
        phone_e164: null,
        title: null,
        outreach_status: null,
        created_at: "2026-05-02T12:00:00Z",
      },
    ],
    applications: (over.applications as any) ?? [
      {
        id: "a1",
        application_code: "BI-ABC-001",
        stage: "documents_pending",
        status: "in_progress",
        created_at: "2026-05-03T12:00:00Z",
      },
    ],
  };
}

// BF_PORTAL_v856_CRM_UNIFY - People: everyone linked to the company, grouped by role.
const peopleFixture = {
  groups: {
    primary: [{ key: "contact:c1", contactId: "c1", name: "Jane Doe", email: "jane@example.com", phone: "+14165551234", role: "primary_applicant", roleLabel: "Primary applicant", detail: "CFO", source: "application", group: "primary" }],
    partners: [],
    guarantors: [{ key: "email:g@x.co", contactId: null, name: "Gail Guarantor", email: "g@x.co", phone: null, role: "guarantor", roleLabel: "Guarantor", detail: null, source: "application", group: "guarantors" }],
    advisors: [],
    other: [{ key: "contact:c2", contactId: "c2", name: "Bob Lee", email: null, phone: null, role: "other", roleLabel: "Other", detail: null, source: "company", group: "other" }],
  },
  people: [],
  roles: {},
};
const emptyPeople = { groups: { primary: [], partners: [], guarantors: [], advisors: [], other: [] }, people: [], roles: {} };

function renderAtId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/silo/bi/crm/companies/${id}`]}>
      <Routes>
        <Route path="/silo/bi/crm/companies/:id" element={<BICompanyDetailPage />} />
        <Route path="/silo/bi/crm" element={<div data-testid="bi-crm-landing" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BLOCK_v211 — BICompanyDetailPage", () => {
  beforeEach(() => {
    apiMock.mockReset();
    getMock.mockReset();
    getMock.mockImplementation(async (path: string) => (path.endsWith("/people") ? peopleFixture : {}));
  });

  it("renders the company legal name and o/a operating name", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    expect(screen.getByText("o/a Acme")).toBeInTheDocument();
  });

  it("suppresses o/a line when operating_name equals legal_name", async () => {
    apiMock.mockResolvedValue(detailFixture({ company: { operating_name: "Acme Inc" } }));
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    expect(screen.queryByText(/^o\/a/)).toBeNull();
  });

  it("renders People grouped by role (applicant, guarantor from the application, other contacts)", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    await waitFor(() => {
      expect(screen.getAllByTestId("crm-company-person")).toHaveLength(3);
    });
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Gail Guarantor")).toBeInTheDocument();
    expect(screen.getByText("Bob Lee")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/api/v1/bi/crm/unified/companies/co-1/people");
    expect(screen.getByText("2 contact(s) at this company")).toBeInTheDocument();
  });

  it("contact row links to /silo/bi/crm/contacts/:id", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    const link = (await screen.findByText("Jane Doe")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/silo/bi/crm/contacts/c1");
  });

  it("renders the applications list with badge count", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    await waitFor(() => {
      expect(screen.getAllByTestId("bi-company-application-row")).toHaveLength(1);
    });
    expect(screen.getByText("BI-ABC-001")).toBeInTheDocument();
    expect(screen.getByText(/documents pending/)).toBeInTheDocument();
  });

  it("application row links to /silo/bi/pipeline/:id", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    const link = (await screen.findByText("BI-ABC-001")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/silo/bi/pipeline/a1");
  });

  it("shows empty groups when nobody is linked", async () => {
    getMock.mockImplementation(async (path: string) => (path.endsWith("/people") ? emptyPeople : {}));
    apiMock.mockResolvedValue(detailFixture({ contacts: [] }));
    renderAtId("co-1");
    await waitFor(() => {
      expect(screen.getByText("Partners")).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId("crm-company-person")).toHaveLength(0);
  });

  it("shows empty-state when applications is []", async () => {
    apiMock.mockResolvedValue(detailFixture({ applications: [] }));
    renderAtId("co-1");
    await waitFor(() => {
      expect(
        screen.getByText(/no applications linked to this company/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the back link to /silo/bi/crm", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    const back = (await screen.findByText(/back to companies/i)) as HTMLAnchorElement;
    // BF_PORTAL_BLOCK_v854_BI_CRM_TAB_URL — back link now carries the tab so it
    // returns to the Companies tab instead of defaulting to Contacts.
    expect(back.getAttribute("href")).toBe("/silo/bi/crm?tab=companies");
  });

  it("shows the company details panel (record values, and application values marked)", async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path.endsWith("/details")) {
        return { tags: [], fields: [
          { key: "city", label: "City", value: "Calgary", source: "company", editable: true, type: "text" },
          { key: "province", label: "Province / State", value: "AB", source: "company", editable: true, type: "text" },
          { key: "website", label: "Website", value: "acme.ca", source: "application", editable: true, type: "url" },
        ] };
      }
      return path.endsWith("/people") ? peopleFixture : {};
    });
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    const panel = await screen.findByTestId("crm-company-details");
    expect(within(panel).getByText("Calgary")).toBeInTheDocument();
    expect(within(panel).getByText("AB")).toBeInTheDocument();
    expect(within(panel).getByText(/from the application/)).toBeInTheDocument();
  });

  it("surfaces API error", async () => {
    apiMock.mockRejectedValueOnce(new Error("404 not_found"));
    renderAtId("missing");
    await waitFor(() => {
      expect(screen.getByText(/404 not_found/)).toBeInTheDocument();
    });
  });
});

describe("BF_PORTAL_BLOCK_v211 — Inline Edit", () => {
  beforeEach(() => {
    apiMock.mockReset();
    getMock.mockReset();
    getMock.mockImplementation(async (path: string) => (path.endsWith("/people") ? peopleFixture : {}));
  });

  it("Edit button toggles the form open, Cancel restores view", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    fireEvent.click(screen.getByTestId("bi-company-edit-button"));
    expect(screen.getByTestId("bi-company-edit-form")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByTestId("bi-company-edit-form")).toBeNull();
  });

  it("PATCH is called only with changed fields", async () => {
    apiMock.mockImplementation(async (path: string, init?: any) => {
      if (init?.method === "PATCH") return { ok: true };
      return detailFixture();
    });
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    fireEvent.click(screen.getByTestId("bi-company-edit-button"));
    fireEvent.change(screen.getByLabelText(/^industry$/i), {
      target: { value: "Logistics" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      const patchCall = apiMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      expect(patchCall![1].body).toEqual({ industry: "Logistics" });
    });
  });

  it("Save disabled when legal_name is cleared", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    fireEvent.click(screen.getByTestId("bi-company-edit-button"));
    fireEvent.change(screen.getByLabelText(/^legal name$/i), {
      target: { value: "" },
    });
    const save = screen.getByRole("button", { name: /^save$/i });
    expect(save).toBeDisabled();
  });

  it("surfaces server error inline", async () => {
    apiMock.mockImplementation(async (path: string, init?: any) => {
      if (init?.method === "PATCH") throw new Error("legal_name_required");
      return detailFixture();
    });
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    fireEvent.click(screen.getByTestId("bi-company-edit-button"));
    fireEvent.change(screen.getByLabelText(/^industry$/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(screen.getByText(/legal_name_required/)).toBeInTheDocument();
    });
  });

  it("Save with no diffs closes the form without a PATCH call", async () => {
    apiMock.mockResolvedValue(detailFixture());
    renderAtId("co-1");
    await waitFor(() => screen.getByText("Acme Inc"));
    fireEvent.click(screen.getByTestId("bi-company-edit-button"));
    // Don't change anything
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("bi-company-edit-form")).toBeNull();
    });
    const patchCall = apiMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patchCall).toBeUndefined();
  });
});
