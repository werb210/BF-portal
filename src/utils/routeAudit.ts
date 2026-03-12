import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { setUiFailure } from "@/utils/uiFailureStore";
import { getAccessToken } from "@/lib/authToken";
import { buildApiUrl } from "@/lib/apiClient";
import { reportAuthFailure } from "@/auth/authEvents";
import { logger } from "@/utils/logger";

type RouteDescriptor = {
  path: string;
  method?: string;
};

export const portalApiRoutes: RouteDescriptor[] = [
  { method: "POST", path: "/api/auth/otp/start" },
  { method: "POST", path: "/api/auth/otp/verify" },
  { method: "GET", path: "/api/auth/me" },
  { method: "POST", path: "/api/auth/logout" },
  { method: "GET", path: "/api/_int/routes" }
];

const AUTH_ROUTE_PREFIXES = ["/api/auth/otp", "/api/auth/me", "/api/auth/logout"];
const normalizePath = (path: string) =>
  path
    .replace(/\/+$/, "")
    .replace(/^\/api(?=\/|$)/, "");

const extractServerRoutes = (payload: unknown): RouteDescriptor[] => {
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => {
      if (typeof entry === "string") {
        return [{ path: entry }];
      }
      if (entry && typeof entry === "object") {
        const record = entry as { path?: string; method?: string; route?: string };
        const resolved = record.path ?? record.route;
        if (resolved) {
          return [{ path: resolved, method: record.method }];
        }
      }
      return [];
    });
  }

  if (payload && typeof payload === "object") {
    const record = payload as { routes?: unknown };
    if (Array.isArray(record.routes)) {
      return extractServerRoutes(record.routes);
    }
  }

  return [];
};

const routeLabel = (route: RouteDescriptor) =>
  `${route.method ? `${route.method} ` : ""}${route.path}`;

const isAuthBootstrapRoute = (route: RouteDescriptor) =>
  AUTH_ROUTE_PREFIXES.some((prefix) => normalizePath(route.path).startsWith(prefix));

const resolveAuthState = async (requestId: string): Promise<boolean> => {
  if (typeof window !== "undefined" && window.location.pathname === "/login") {
    return false;
  }
  const token = getAccessToken();
  if (!token) return false;
  try {
    const response = await fetch(buildApiUrl("/auth/me"), {
      headers: {
        "X-Request-Id": requestId,
        Authorization: `Bearer ${token}`
      }
    });
    if (response.status === 401) {
      reportAuthFailure("unauthorized");
    }
    return response.ok;
  } catch {
    return false;
  }
};

export const runRouteAudit = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  const requestId = getRequestId();
  const hasToken = await resolveAuthState(requestId);
  console.info("Route audit start", {
    requestId,
    routeCount: portalApiRoutes.length,
    authenticated: hasToken
  });

  try {
    const response = await fetch(buildApiUrl("/_int/routes"), {
      headers: { "X-Request-Id": requestId }
    });

    if (!response.ok) {
      logger.warn("Route audit fetch failed", {
        requestId,
        status: response.status
      });
      return;
    }

    const payload = await response.json().catch(() => null);
    const serverRoutes = extractServerRoutes(payload);
    if (serverRoutes.length === 0) {
      logger.warn("Route audit unavailable: no routes payload.", { requestId });
      return;
    }
    const serverSet = new Set(serverRoutes.map((route) => normalizePath(route.path)));

    const missing = portalApiRoutes.filter(
      (route) => !serverSet.has(normalizePath(route.path))
    );

    const missingAuthRoutes = missing.filter(isAuthBootstrapRoute);
    const missingNonAuthRoutes = missing.filter((route) => !isAuthBootstrapRoute(route));

    if (missingAuthRoutes.length > 0) {
      const missingLabels = missingAuthRoutes.map(routeLabel);
      logger.warn("Route audit bypassed for auth bootstrap route", {
        requestId,
        missing: missingLabels
      });
      emitUiTelemetry("api_error", {
        requestId,
        missing: missingLabels,
        reason: "route_audit_auth_bypass"
      });
    }

    if (missingNonAuthRoutes.length > 0) {
      const missingLabels = missingNonAuthRoutes.map(routeLabel);
      logger.warn("Route audit mismatch", {
        requestId,
        missing: missingLabels,
        serverCount: serverRoutes.length
      });
      if (hasToken) {
        setUiFailure({
          message: "Server route mismatch detected.",
          details: `Missing routes: ${missingLabels.join(", ")} | Request ID: ${requestId}`,
          timestamp: Date.now()
        });
      }
      return;
    }

    console.info("Route audit complete", {
      requestId,
      serverCount: serverRoutes.length
    });
  } catch (error) {
    logger.warn("Route audit unavailable.", { requestId, error });
  }
};
