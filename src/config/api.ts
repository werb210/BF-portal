/**
 * BF_SILO_API_ROUTING_v43 — Block 43
 *
 * The BF and SLF silos share one server (server.boreal.financial) with silo
 * isolation enforced by the X-Silo header and silo column on every record.
 * BI is different: it runs on its own Azure App Service with its own Postgres
 * database. So path-based routing decides where each request goes:
 *
 *   /api/v1/...  -> BI-Server (VITE_BI_API_URL)
 *   /api/...     -> BF-Server (VITE_BF_API_URL or VITE_API_URL fallback)
 *
 * The X-Silo header is still sent on every request so BF-Server can filter
 * BF/SLF data; BI-Server ignores it (the entire BI database IS the BI silo).
 */
import { getActiveBusinessUnit } from "@/context/BusinessUnitContext";

const BF_SERVER_URL =
  import.meta.env.VITE_BF_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

const BI_SERVER_URL =
  import.meta.env.VITE_BI_API_URL ||
  // Sane production fallback — Todd's BI Web App default domain.
  "https://bi-server-cse0apamgkheb9d5.canadacentral-01.azurewebsites.net";

/**
 * Resolve the server base URL for a given API path.
 *
 * - /api/v1/* paths route to BI-Server.
 * - All other paths route to BF-Server.
 * - The path itself is path-based, not silo-based, because the silo header is
 *   used for record filtering inside BF-Server. Mixing routing into X-Silo
 *   would conflate two concerns.
 */
export function resolveApiBase(path: string): string {
  if (typeof path === "string" && path.startsWith("/api/v1/")) {
    return BI_SERVER_URL;
  }
  return BF_SERVER_URL;
}

/**
 * Default base for callers that don't know the path yet (rare). Returns the
 * BF base — the historical default. Code that builds full URLs SHOULD prefer
 * resolveApiBase(path).
 *
 * @deprecated prefer resolveApiBase(path) when the request path is known.
 */
export function getApiBase(): string {
  return BF_SERVER_URL;
}

export function getActiveSilo(): string {
  return getActiveBusinessUnit() ?? "BF";
}

/** @deprecated retained for legacy callers; prefer resolveApiBase(path). */
export const API_BASE = BF_SERVER_URL;

/** Build a full URL for a path, routing to the right server automatically. */
export const buildApiUrl = (path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid API path: "${path}" — must start with /`);
  }
  return `${resolveApiBase(path)}${path}`;
};

/** Exposed for tests and the WebSocket layer. */
export const __apiBaseUrls = {
  bf: BF_SERVER_URL,
  bi: BI_SERVER_URL,
};
