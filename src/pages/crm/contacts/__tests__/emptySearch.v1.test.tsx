import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContactsPage from "@/pages/crm/contacts/ContactsPage";
import { useCrmStore } from "@/state/crm.store";

const { apiMock } = vi.hoisted(() => {
  const mock = vi.fn() as unknown as {
    <T = unknown>(path: string, options?: unknown): Promise<T>;
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  mock.get = vi.fn();
  mock.post = vi.fn();
  mock.patch = vi.fn();
  return { apiMock: mock };
});

vi.mock("@/api", () => ({
  default: apiMock,
  api: apiMock,
  // BF_PORTAL_ENVELOPE_GET_v1 - the paged list calls use apiGetEnvelope (api.get strips
  // the envelope, so meta.total was unreachable). Mock returns the same envelope shape.
  apiGetEnvelope: async (path: string, options?: any) => {
    const r: any = await (apiMock.get as any)(path, options);
    return Array.isArray(r) ? { data: r, meta: { total: r.length } } : r;
  },
}));


vi.mock("@/utils/requireAuth", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => ({ silo: "BF" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Portal User", role: "Admin" } }),
}));
vi.mock("@/lib/authToken", () => ({
  getAuthToken: vi.fn(() => "staff-jwt-token"),
}));

vi.mock("@/config/microsoftAuth", () => ({
  microsoftAuthConfig: {
    clientId: "",
    authority: "",
    redirectUri: "",
    scopes: ["openid"],
  },
}));

vi.mock("@azure/msal-browser", () => ({
  BrowserAuthError: class BrowserAuthError extends Error {
    errorCode = "";
  },
  PublicClientApplication: class PublicClientApplication {
    initialize() {
      return Promise.resolve();
    }
  },
}));


function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// BF_PORTAL_CRM_EMPTY_SEARCH_v1
describe("empty contact list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { sessionStorage.clear(); localStorage.clear(); } catch { /* none */ }
    useCrmStore.setState({ filters: { search: "", owner: null, hasActiveApplication: false } });
    apiMock.get.mockImplementation((path: string) => Promise.resolve(path === "/api/users" ? { users: [] } : []));
  });

  it("says nothing matched the search, points to the other businesses, and clears it", async () => {
    renderWithQuery(<MemoryRouter><ContactsPage /></MemoryRouter>);
    const box = await screen.findByPlaceholderText(/Search contacts/i);
    fireEvent.change(box, { target: { value: "Debra Silas" } });
    await waitFor(() => expect(screen.getByText(/No contacts match/)).toBeInTheDocument());
    expect(screen.getByText(/Insurance and Keystone keep their own contacts/)).toBeInTheDocument();
    expect(screen.queryByText(/No contacts in this silo/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("crm-clear-filters"));
    await waitFor(() => expect((box as HTMLInputElement).value).toBe(""));
    await waitFor(() => expect(screen.getByText("No contacts yet.")).toBeInTheDocument());
  });
});
