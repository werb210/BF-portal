// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import LendersPage from "@/pages/lenders/LendersPage";
import LoginPage from "@/pages/login/LoginPage";
import PrivateRoute from "@/router/PrivateRoute";
import {
  LENDER_PRODUCT_CATEGORIES,
  LENDER_PRODUCT_CATEGORY_LABELS,
  isLenderProductCategory
} from "@/types/lenderManagement.types";
import type { Lender, LenderProduct } from "@/types/lenderManagement.models";
import {
  createLender,
  createLenderProduct,
  fetchLenderById,
  fetchLenderProducts,
  fetchLenders,
  updateLender
} from "@/api/lenders";
import { clearStoredAuth, setStoredAccessToken } from "@/services/token";

vi.mock("@/api/lenders", () => ({
  fetchLenders: vi.fn(),
  fetchLenderById: vi.fn(),
  createLender: vi.fn(),
  updateLender: vi.fn(),
  fetchLenderProducts: vi.fn(),
  createLenderProduct: vi.fn(),
  updateLenderProduct: vi.fn()
}));

const createJsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

const renderWithProviders = (initialEntry: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/lenders"
              element={
                <PrivateRoute>
                  <LendersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/lenders/new"
              element={
                <PrivateRoute>
                  <LendersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/lenders/:lenderId/edit"
              element={
                <PrivateRoute>
                  <LendersPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const baseLender: Lender = {
  id: "l-1",
  name: "Northwind Capital",
  active: true,
  status: "ACTIVE",
  address: {
    street: "1 Main St",
    city: "Austin",
    stateProvince: "TX",
    postalCode: "78701",
    country: "US"
  },
  phone: "+1 555 111 2222",
  website: null,
  description: null,
  internalNotes: null,
  processingNotes: null,
  primaryContact: {
    name: "Alex Agent",
    email: "alex@example.com",
    phone: "+1 555 111 3333",
    mobilePhone: "+1 555 111 4444"
  },
  submissionConfig: {
    method: "API",
    sheetId: null,
    worksheetName: null,
    mappingPreview: null,
    sheetStatus: null,
    attachmentFormat: null,
    apiAuthType: "token",
    apiBaseUrl: "https://api.example.com",
    apiClientId: "client-id",
    apiUsername: "api-user",
    apiPassword: "super-secret",
    submissionEmail: null
  },
  operationalLimits: {
    maxLendingLimit: null,
    maxLtv: null,
    maxLoanTerm: null,
    maxAmortization: null
  }
};

const baseProduct: LenderProduct = {
  id: "p-1",
  lenderId: "l-1",
  productName: "Term loan",
  active: true,
  category: "TERM_LOAN",
  country: "US",
  currency: "USD",
  minAmount: 10000,
  maxAmount: 500000,
  interestRateMin: 6.5,
  interestRateMax: 10.25,
  rateType: "fixed",
  termLength: {
    min: 6,
    max: 60,
    unit: "months"
  },
  fees: null,
  minimumCreditScore: 650,
  ltv: 80,
  eligibilityRules: "None",
  eligibilityFlags: {
    minimumRevenue: 0,
    timeInBusinessMonths: 12,
    industryRestrictions: null
  },
  requiredDocuments: []
};

describe("lender management flows", () => {
  beforeEach(() => {
    window.__TEST_AUTH__ = { isAuthenticated: true, role: "Admin" };
    clearStoredAuth();
    setStoredAccessToken("test-token");
    const fetchSpy = vi.fn().mockResolvedValue(createJsonResponse({ id: "u1", role: "Admin" }));
    vi.stubGlobal("fetch", fetchSpy);
    vi.mocked(fetchLenderProducts).mockResolvedValue([]);
  });

  afterEach(() => {
    delete window.__TEST_AUTH__;
    clearStoredAuth();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders lender list", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValue([baseLender]);

    renderWithProviders("/lenders");

    expect(
      await screen.findByText(/Northwind Capital/, {}, { timeout: 10000 })
    ).toBeInTheDocument();
  });

  it("creates a new lender", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValueOnce([]).mockResolvedValue([baseLender]);
    const createLenderMock = vi.mocked(createLender);
    createLenderMock.mockResolvedValueOnce(baseLender);

    renderWithProviders("/lenders/new");

    const nameInput = await screen.findByLabelText(/Lender name/i);
    await userEvent.type(nameInput, "Northwind Capital");
    await userEvent.selectOptions(screen.getByLabelText(/^Country$/i), "United States");
    await userEvent.type(screen.getByLabelText(/Contact name/i), "Primary Contact");
    await userEvent.type(screen.getByLabelText(/Contact email/i), "primary@example.com");
    await userEvent.type(screen.getByLabelText(/Target email address/i), "submissions@example.com");

    const createButtons = screen.getAllByRole("button", { name: /Create lender/i });
    await userEvent.click(createButtons[createButtons.length - 1]);

    await waitFor(() => {
      expect(createLenderMock).toHaveBeenCalled();
    });
  }, 15000);

  it("updates lender info", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValue([baseLender]);
    const fetchLenderByIdMock = vi.mocked(fetchLenderById);
    fetchLenderByIdMock.mockResolvedValueOnce(baseLender);
    const updateLenderMock = vi.mocked(updateLender);
    updateLenderMock.mockResolvedValueOnce(baseLender);

    renderWithProviders("/lenders/l-1/edit");

    const nameInput = await screen.findByLabelText(/Lender name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Northwind Updated");
    await userEvent.click(await screen.findByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(updateLenderMock).toHaveBeenCalled();
    });
  });

  it("loads all lender fields on edit", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValue([baseLender]);
    const fetchLenderByIdMock = vi.mocked(fetchLenderById);
    fetchLenderByIdMock.mockResolvedValueOnce(baseLender);

    renderWithProviders("/lenders/l-1/edit");

    await waitFor(() => {
      expect(screen.getByLabelText(/Lender name/i)).toHaveValue("Northwind Capital");
    });
    expect(screen.getByLabelText(/^Country$/i)).toHaveValue("US");
    expect(screen.getByLabelText(/Contact name/i)).toHaveValue("Alex Agent");
    expect(screen.getByLabelText(/Contact email/i)).toHaveValue("alex@example.com");
    expect(screen.getByLabelText(/Contact phone/i)).toHaveValue("+1 555 111 3333");
    expect(screen.getByLabelText(/Submission method/i)).toHaveValue("API");
    expect(screen.getByRole("checkbox", { name: /Active lender/i })).toBeChecked();
  });

  it("renders lender products", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValue([baseLender]);
    const fetchLenderProductsMock = vi.mocked(fetchLenderProducts);
    fetchLenderProductsMock.mockResolvedValue([baseProduct]);

    renderWithProviders("/lenders");

    expect(await screen.findByRole("button", { name: /Term loan/i })).toBeInTheDocument();
  });

  it("creates a lender product", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValue([baseLender]);
    const fetchLenderProductsMock = vi.mocked(fetchLenderProducts);
    fetchLenderProductsMock.mockResolvedValue([]);
    const createLenderProductMock = vi.mocked(createLenderProduct);
    createLenderProductMock.mockResolvedValue(baseProduct);

    renderWithProviders("/lenders");

    await userEvent.click(await screen.findByRole("button", { name: /Add product/i }));

    const nameInput = await screen.findByLabelText(/Product name/i);
    await userEvent.type(nameInput, "Term loan");
    await userEvent.selectOptions(screen.getByLabelText(/Product category/i), "TERM_LOAN");
    await userEvent.click(screen.getByLabelText("United States"));
    await userEvent.type(screen.getAllByLabelText(/Minimum amount/i)[0], "10000");
    await userEvent.type(screen.getAllByLabelText(/Maximum amount/i)[0], "500000");
    await userEvent.type(screen.getByLabelText(/Interest min/i), "6.5");
    await userEvent.type(screen.getByLabelText(/Interest max/i), "10.25");
    await userEvent.type(screen.getByLabelText(/Min term/i), "6");
    await userEvent.type(screen.getByLabelText(/Max term/i), "60");

    fireEvent.click(screen.getByRole("button", { name: /(Save product|Saving\.\.\.)/i }));

    await waitFor(() => {
      expect(createLenderProductMock).toHaveBeenCalled();
    });
  }, 10000);

  it("validates lender product categories", () => {
    LENDER_PRODUCT_CATEGORIES.forEach((category) => {
      expect(isLenderProductCategory(category)).toBe(true);
      expect(LENDER_PRODUCT_CATEGORY_LABELS[category]).toBeTruthy();
    });
  });

  it("sends users to login when unauthenticated", async () => {
    delete window.__TEST_AUTH__;
    clearStoredAuth();
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchSpy);

    renderWithProviders("/lenders");

    await waitFor(() => {
      expect(screen.queryByText(/lenders/i)).not.toBeInTheDocument();
    });
  });

  it("displays a form validation error when required fields are missing", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValueOnce([]);

    renderWithProviders("/lenders/new");

    const modal = await screen.findByRole("dialog");
    const createButton = within(modal).getByRole("button", { name: /Create lender/i });
    fireEvent.click(createButton);

    const errorMessage = await within(modal).findByText(/Target email address is required/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it("renders lender products with adjustable product forms", async () => {
    const fetchLendersMock = vi.mocked(fetchLenders);
    fetchLendersMock.mockResolvedValue([baseLender]);
    const fetchLenderProductsMock = vi.mocked(fetchLenderProducts);
    fetchLenderProductsMock.mockResolvedValue([baseProduct]);

    renderWithProviders("/lenders");

    const productButton = await screen.findByRole("button", { name: /Term loan/i });
    fireEvent.click(productButton);

    expect(screen.getByLabelText(/Product name/i)).toBeInTheDocument();
  });
});
