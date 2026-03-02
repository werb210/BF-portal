import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement } from "react";
import { MemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";
import { BusinessUnitProvider } from "@/context/BusinessUnitContext";
import { DEFAULT_BUSINESS_UNIT } from "@/types/businessUnit";
import { LenderAuthProvider } from "@/lender/auth/LenderAuthContext";
import { mockAuthedUser, type TestRole } from "@/test/utils/auth";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

type ExtendedRenderOptions = Omit<RenderOptions, "wrapper"> & {
  route?: string;
  role?: TestRole;
  auth?: Partial<AuthContextValue>;
};

const createAuthValue = (overrides: Partial<AuthContextValue>): AuthContextValue => {
  const fallbackUser = { id: "test-user", email: "staff@example.com", role: "Staff" };
  const user = overrides.user ?? fallbackUser;

  return {
    authState: "authenticated",
    status: "authenticated",
    authStatus: "authenticated",
    rolesStatus: "resolved",
    user,
    accessToken: "test-token",
    role: (overrides.role ?? (typeof user?.role === "string" ? (user.role as any) : "Staff")) as any,
    roles: overrides.roles ?? [((typeof user?.role === "string" ? user.role : "Staff") as any)],
    capabilities: [],
    error: null,
    pendingPhoneNumber: null,
    authenticated: overrides.authenticated ?? true,
    isAuthenticated: overrides.isAuthenticated ?? overrides.authenticated ?? true,
    isLoading: false,
    authReady: true,
    isHydratingSession: false,
    login: async () => false,
    startOtp: async () => true,
    verifyOtp: async () => true,
    loginWithOtp: async () => true,
    refreshUser: async () => true,
    clearAuth: () => undefined,
    logout: async () => {
      localStorage.removeItem("persist");
      sessionStorage.removeItem("persist");
    },
    setAuth: () => undefined,
    setUser: () => undefined,
    setAuthenticated: () => undefined,
    setAuthState: () => undefined,
    ...overrides
  };
};

export const renderWithProviders = (ui: ReactElement, options: ExtendedRenderOptions = {}) => {
  const { route = "/", role = "Staff", auth = {}, ...rest } = options;
  const authedUser = mockAuthedUser(role);
  const queryClient = createQueryClient();
  const shouldWrapRouter = ui.type !== MemoryRouter && ui.type !== RouterProvider;

  const result = render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {shouldWrapRouter ? (
          <MemoryRouter initialEntries={[route]}>
            <AuthContext.Provider value={createAuthValue({ user: authedUser, role, roles: [role], ...auth })}>
              <BusinessUnitProvider>{children}</BusinessUnitProvider>
            </AuthContext.Provider>
          </MemoryRouter>
        ) : (
          <AuthContext.Provider value={createAuthValue({ user: authedUser, role, roles: [role], ...auth })}>
            <BusinessUnitProvider>{children}</BusinessUnitProvider>
          </AuthContext.Provider>
        )}
      </QueryClientProvider>
    ),
    ...rest
  });

  return {
    ...result,
    queryClient
  };
};

export const renderWithLenderProviders = (ui: ReactElement, options: Omit<RenderOptions, "wrapper"> = {}) => {
  const queryClient = createQueryClient();
  const shouldWrapRouter = ui.type !== MemoryRouter && ui.type !== RouterProvider;

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {shouldWrapRouter ? (
          <MemoryRouter initialEntries={["/"]}>
            <LenderAuthProvider>{children}</LenderAuthProvider>
          </MemoryRouter>
        ) : (
          <LenderAuthProvider>{children}</LenderAuthProvider>
        )}
      </QueryClientProvider>
    ),
    ...options
  });
};

export const testBusinessUnit = DEFAULT_BUSINESS_UNIT;
