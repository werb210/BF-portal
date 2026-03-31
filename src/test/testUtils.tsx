import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement } from "react";
import { MemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "@/auth/AuthContext";
import type { Role } from "@/auth/roles";
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
  const resolvedRole = overrides.role ?? (typeof user?.role === "string" ? user.role : "Staff");
  const resolvedRoles = overrides.roles ?? [resolvedRole];
  const resolvedToken = overrides.token ?? "test-token";
  const resolvedAuthStatus = overrides.authStatus ?? "authenticated";
  const resolvedRolesStatus = overrides.rolesStatus ?? "resolved";
  const isAuthenticated = overrides.isAuthenticated ?? overrides.authenticated ?? true;

  return {
    authStatus: resolvedAuthStatus,
    rolesStatus: resolvedRolesStatus,
    authReady: overrides.authReady ?? true,
    authenticated: isAuthenticated,
    isAuthenticated,
    isLoading: overrides.isLoading ?? false,
    token: resolvedToken,
    user,
    role: resolvedRole,
    roles: resolvedRoles,
    hasRole: (role) => resolvedRoles.includes(role),
    canAccessSilo: () => true,
    logout: overrides.logout ?? (() => undefined),
    clearAuth: overrides.clearAuth ?? (() => undefined),
    setAuth: overrides.setAuth ?? (() => undefined),
    setToken: overrides.setToken ?? (() => undefined),
    startOtp: async () => true,
    loginWithOtp: async () => ({ ok: true }),
    ...overrides
  };
};

export const renderWithProviders = (ui: ReactElement, options: ExtendedRenderOptions = {}) => {
  const { route = "/", role = "Staff", auth = {}, ...rest } = options;
  const effectiveRole = (auth.role as TestRole | undefined) ?? ((auth.user as { role?: TestRole } | undefined)?.role ?? role);
  const effectiveAuthRole = effectiveRole as Role;
  const authedUser = mockAuthedUser(effectiveRole);
  const queryClient = createQueryClient();
  const shouldWrapRouter = ui.type !== MemoryRouter && ui.type !== RouterProvider;

  const result = render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {shouldWrapRouter ? (
          <MemoryRouter initialEntries={[route]}>
            <AuthContext.Provider value={createAuthValue({ user: authedUser, role: effectiveAuthRole, roles: [effectiveAuthRole], ...auth })}>
              <BusinessUnitProvider>{children}</BusinessUnitProvider>
            </AuthContext.Provider>
          </MemoryRouter>
        ) : (
          <AuthContext.Provider value={createAuthValue({ user: authedUser, role: effectiveAuthRole, roles: [effectiveAuthRole], ...auth })}>
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
