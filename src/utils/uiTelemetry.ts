import type { UserRole } from "@/utils/roles";

export type UiTelemetryEvent =
  | "page_loaded"
  | "data_loaded"
  | "permission_blocked"
  | "api_error"
  | "lender_create"
  | "lender_update";

export type AuthStatus = "pending" | "authenticated" | "unauthenticated";

export type UiTelemetryPayload = {
  route?: string;
  authStatus?: AuthStatus;
  role?: UserRole | null;
  silo?: string | null;
  requestId?: string;
  [key: string]: unknown;
};

type AuthTelemetryContext = {
  authStatus: AuthStatus;
  role: UserRole | null;
  silo: string | null;
};

let authTelemetryContext: AuthTelemetryContext = {
  authStatus: "unauthenticated",
  role: null,
  silo: null
};

const getRoutePath = () => {
  if (typeof window === "undefined") return "unknown";
  return window.location.pathname || "unknown";
};

export const setAuthTelemetryContext = (next: Partial<AuthTelemetryContext>) => {
  authTelemetryContext = { ...authTelemetryContext, ...next };
};

export const emitUiTelemetry = (event: UiTelemetryEvent, payload: UiTelemetryPayload = {}) => {
  const basePayload = {
    event,
    route: getRoutePath(),
    authStatus: authTelemetryContext.authStatus,
    role: authTelemetryContext.role,
    silo: authTelemetryContext.silo
  };
  console.info("[telemetry] ui", { ...basePayload, ...payload });
};
