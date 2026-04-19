import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContactsPage from "@/pages/crm/contacts/ContactsPage";
import CommunicationsPage from "@/pages/communications/CommunicationsPage";
import ProfileSettings from "@/pages/settings/tabs/ProfileSettings";
import RuntimeSettings from "@/pages/settings/tabs/RuntimeSettings";
import { useCrmStore } from "@/state/crm.store";
import { useSettingsStore } from "@/state/settings.store";
import { fetchContacts } from "@/api/crm";

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("CRM owner dropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useCrmStore.setState({
      silo: "BF",
      filters: { search: "", owner: null, hasActiveApplication: false },
    });
  });

  it("renders owner names fetched from /api/users and stores selected owner id", async () => {
    apiMock.get.mockImplementation((path: string) => {
      if (path === "/api/users") {
        return Promise.resolve({
          users: [
            { id: "u-1", first_name: "Alex", last_name: "Morgan" },
            { id: "u-2", first_name: "Taylor", last_name: "Reed" },
          ],
        });
      }
      return Promise.resolve([]);
    });

    renderWithQuery(<ContactsPage />);

    const ownerFilter = await screen.findByTestId("owner-filter");
    await waitFor(() => {
      expect(within(ownerFilter).getByRole("option", { name: "Alex Morgan" })).toBeInTheDocument();
      expect(within(ownerFilter).getByRole("option", { name: "Taylor Reed" })).toBeInTheDocument();
    });

    fireEvent.change(ownerFilter, { target: { value: "u-2" } });

    await waitFor(() => {
      expect(useCrmStore.getState().filters.owner).toBe("u-2");
    });
  });
});

describe("CRM filters API params", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("sends owner_id and has_applications when active application filter is enabled", async () => {
    useCrmStore.setState({
      silo: "BF",
      filters: { search: "", owner: "owner-7", hasActiveApplication: true },
    });

    apiMock.get.mockResolvedValueOnce([]);

    await fetchContacts();

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/crm/contacts?silo=BF&owner_id=owner-7&has_applications=true",
    );
  });
});

describe("SMS layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows selected contact header and message input at the same time", async () => {
    (apiMock as any).mockResolvedValueOnce({
      contacts: [{ id: "c-1", name: "Jordan Lee", phone: "+15551234567" }],
    });
    (apiMock as any).mockResolvedValueOnce({
      messages: [{ id: "m-1", direction: "inbound", body: "Hello", created_at: new Date().toISOString() }],
    });

    renderWithQuery(<CommunicationsPage />);

    const contact = await screen.findByText("Jordan Lee");
    fireEvent.click(contact);

    await waitFor(() => {
      expect(screen.getAllByText("Jordan Lee").length).toBeGreaterThan(1);
      expect(screen.getByPlaceholderText("iMessage")).toBeInTheDocument();
    });
  });
});

describe("My Profile save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    useSettingsStore.getState().reset();
  });

  it("pre-populates names from /api/users/me and saves names without Microsoft dependency", async () => {
    apiMock.get.mockImplementation((path: string) => {
      if (path === "/api/users/me") {
        return Promise.resolve({
          first_name: "Jamie",
          last_name: "Quinn",
          email: "jamie@example.com",
          phone: "",
          microsoftConnected: false,
        });
      }
      return Promise.resolve({});
    });
    apiMock.patch.mockResolvedValueOnce({ success: true });

    render(<ProfileSettings />);

    expect(await screen.findByDisplayValue("Jamie")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Quinn")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Casey" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Morgan" } });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiMock.patch).toHaveBeenCalledWith("/api/users/me", {
        first_name: "Casey",
        last_name: "Morgan",
      });
    });
  });
});

describe("Runtime verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/_int/runtime with staff JWT authorization and renders statuses", async () => {
    apiMock.get.mockImplementation((path: string, options?: { headers?: Record<string, string> }) => {
      if (path === "/api/health") {
        return Promise.resolve({ status: "ok" });
      }
      if (path === "/api/_int/runtime") {
        expect(options?.headers?.Authorization).toBe("Bearer staff-jwt-token");
        return Promise.resolve({ database: "ok", auth: "ready" });
      }
      return Promise.resolve({});
    });

    render(<RuntimeSettings />);

    expect((await screen.findAllByText("ok")).length).toBeGreaterThan(0);
    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith("/api/_int/runtime", {
      headers: { Authorization: "Bearer staff-jwt-token" },
    });
  });
});
