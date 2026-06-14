// BF_PORTAL_BLOCK_v209_BI_COMPANIES_LIST_v1
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const apiMock = vi.fn();
vi.mock("@/api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import BICompaniesList from "@/silos/bi/crm/companies/BICompaniesList";

function rowFixture(over: Partial<Record<string, unknown>> = {}) {
  return {
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
    contact_count: 3,
    ...over,
  };
}

function renderList() {
  return render(
    <MemoryRouter>
      <BICompaniesList />
    </MemoryRouter>,
  );
}

describe("BF_PORTAL_BLOCK_v209 — BICompaniesList", () => {
  beforeEach(() => apiMock.mockReset());

  it("loads companies on mount and renders one row each", async () => {
    apiMock.mockResolvedValueOnce([rowFixture(), rowFixture({ id: "co-2", legal_name: "Beta Co", operating_name: null })]);
    renderList();
    await waitFor(() => {
      expect(screen.getAllByTestId("bi-company-row")).toHaveLength(2);
    });
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getByText("Beta Co")).toBeInTheDocument();
  });

  it("shows o/a operating_name when different from legal_name", async () => {
    apiMock.mockResolvedValueOnce([rowFixture()]);
    renderList();
    await waitFor(() => screen.getByText("Acme Inc"));
    expect(screen.getByText("o/a Acme")).toBeInTheDocument();
  });

  it("does not show o/a line when operating_name equals legal_name", async () => {
    apiMock.mockResolvedValueOnce([rowFixture({ operating_name: "Acme Inc" })]);
    renderList();
    await waitFor(() => screen.getByText("Acme Inc"));
    expect(screen.queryByText(/^o\/a/)).toBeNull();
  });

  it("includes ?sort=created_at:desc on first fetch", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining("sort=created_at%3Adesc"),
      );
    });
  });

  it("re-fetches with new sort on header click", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();
    fireEvent.click(screen.getByText(/^Company name/));
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        expect.stringContaining("sort=name%3Aasc"),
      );
    });
  });

  it("appends q= when search box changes", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();
    fireEvent.change(screen.getByLabelText(/search companies/i), {
      target: { value: "acme" },
    });
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("q=acme"));
    });
  });

  it("row name links to /silo/bi/crm/companies/:id", async () => {
    apiMock.mockResolvedValue([rowFixture({ id: "abc-123" })]);
    renderList();
    const link = (await screen.findByText("Acme Inc")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/silo/bi/crm/companies/abc-123");
  });

  it("shows contact_count from rollup", async () => {
    apiMock.mockResolvedValueOnce([rowFixture({ contact_count: 7 })]);
    renderList();
    await waitFor(() => screen.getByText("Acme Inc"));
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("formats Location as 'City, Province'", async () => {
    apiMock.mockResolvedValueOnce([rowFixture()]);
    renderList();
    await waitFor(() => screen.getByText("Acme Inc"));
    expect(screen.getByText("Calgary, AB")).toBeInTheDocument();
  });

  it("renders empty-state when API returns []", async () => {
    apiMock.mockResolvedValueOnce([]);
    renderList();
    await waitFor(() => {
      expect(screen.getByText(/No BI companies/i)).toBeInTheDocument();
    });
  });

  it("surfaces API error in the table body", async () => {
    apiMock.mockRejectedValueOnce(new Error("upstream_5xx"));
    renderList();
    await waitFor(() => {
      expect(screen.getByText(/upstream_5xx/)).toBeInTheDocument();
    });
  });
});

describe("BF_PORTAL_BLOCK_v209 — Inline Create", () => {
  beforeEach(() => apiMock.mockReset());

  it("toggles the inline create form open and closed", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("bi-companies-create-toggle"));
    expect(screen.getByTestId("bi-companies-create-form")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("bi-companies-create-toggle"));
    expect(screen.queryByTestId("bi-companies-create-form")).toBeNull();
  });

  it("Create button disabled when legal name empty", async () => {
    apiMock.mockResolvedValue([]);
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("bi-companies-create-toggle"));
    const create = screen.getByRole("button", { name: /^create$/i });
    expect(create).toBeDisabled();
  });

  it("POSTs to /crm/companies with legal_name and industry, then refreshes list", async () => {
    apiMock.mockImplementation(async (path: string, init?: any) => {
      if (init?.method === "POST") return { ok: true, id: "co-new" };
      return [];
    });
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const fetchCountBefore = apiMock.mock.calls.length;

    fireEvent.click(screen.getByTestId("bi-companies-create-toggle"));
    fireEvent.change(screen.getByLabelText(/^legal name$/i), {
      target: { value: "New Co" },
    });
    fireEvent.change(screen.getByLabelText(/^industry$/i), {
      target: { value: "Logistics" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      const postCall = apiMock.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      expect(postCall![1].body).toEqual({
        legal_name: "New Co",
        industry: "Logistics",
      });
    });

    // After successful create, the list is re-fetched.
    await waitFor(() => {
      expect(apiMock.mock.calls.length).toBeGreaterThan(fetchCountBefore + 1);
    });
  });

  it("surfaces create error inline", async () => {
    apiMock.mockImplementation(async (path: string, init?: any) => {
      if (init?.method === "POST") throw new Error("legal_name_required");
      return [];
    });
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("bi-companies-create-toggle"));
    fireEvent.change(screen.getByLabelText(/^legal name$/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => {
      expect(screen.getByText(/legal_name_required/)).toBeInTheDocument();
    });
  });
});


describe("BF_PORTAL_BLOCK_v816 — companies import UI", () => {
  beforeEach(() => {
    apiMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders company tags in the Tags column", async () => {
    apiMock.mockResolvedValueOnce([rowFixture({ tags: ["financing:equipment", "country:CA", "lender"] })]);
    renderList();

    await waitFor(() => screen.getByText("Acme Inc"));
    // Tags also appear as "View by" filter chips above the table, so scope the
    // assertion to the company's row to verify the Tags column specifically.
    const row = screen.getByText("Acme Inc").closest("tr") as HTMLElement;
    const inRow = within(row);
    expect(inRow.getByText("financing:equipment")).toBeInTheDocument();
    expect(inRow.getByText("country:CA")).toBeInTheDocument();
    expect(inRow.getByText("lender")).toBeInTheDocument();
  });

  it("uploads selected company import files and refreshes with import counts", async () => {
    apiMock.mockImplementation(async (_path: string, init?: any) => {
      if (init?.method === "POST") {
        return {
          companies_imported: 2,
          companies_updated: 1,
          contacts_imported: 4,
          contacts_updated: 3,
        };
      }
      return [];
    });
    renderList();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const fetchCountBefore = apiMock.mock.calls.length;

    const file = new File(["legal_name\nAcme"], "companies.csv", { type: "text/csv" });
    fireEvent.change(screen.getByTestId("bi-companies-import-input"), { target: { files: [file] } });

    await waitFor(() => {
      const postCall = apiMock.mock.calls.find(([path, init]) => path === "/api/v1/bi/crm/companies/import" && init?.method === "POST");
      expect(postCall).toBeDefined();
      expect(postCall![1].body).toBeInstanceOf(FormData);
    });
    expect(await screen.findByText(/Companies: 2 new, 1 updated · Contacts: 4 new, 3 updated/)).toBeInTheDocument();
    await waitFor(() => expect(apiMock.mock.calls.length).toBeGreaterThan(fetchCountBefore + 1));
  });

  it("imports selected BI companies to BF and clears the selection", async () => {
    apiMock.mockImplementation(async (path: string, init?: any) => {
      if (path === "/api/portal/lenders/import-from-bi" && init?.method === "POST") {
        return { lenders_created: 1, products_created: 2, lenders_skipped: 1 };
      }
      return [rowFixture({ id: "co-1", tags: ["lender"] })];
    });
    renderList();
    await waitFor(() => screen.getByText("Acme Inc"));

    const rowCheckbox = screen.getAllByRole("checkbox")[1] as HTMLElement;
    fireEvent.click(rowCheckbox);
    fireEvent.click(screen.getByTestId("bi-companies-import-to-bf"));

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith(
        "/api/portal/lenders/import-from-bi",
        expect.objectContaining({ method: "POST", body: { companyIds: ["co-1"] } }),
      );
    });
    expect(await screen.findByText(/Imported to BF: 1 lenders, 2 products, 1 skipped/)).toBeInTheDocument();
    expect(screen.queryByTestId("bi-companies-import-to-bf")).toBeNull();
  });
});
