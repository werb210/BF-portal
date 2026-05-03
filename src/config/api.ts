// BF_PORTAL_BLOCK_v86_ROUTING_DRAWER_CATEGORIES_TOPBAR_v1
// Reverts BI_HARD_ISOLATION_v59 (silo-based routing). Architecture:
// BF-Server is the shared backend for BF/BI/SLF silos with ?silo= query
// param. Only paths under /api/v1/bi/* or /api/v1/pgi/* go to BI-Server.
// The previous "send everything to BI-Server when in BI silo" change
// broke auth, CRM, users, telephony, lender management for any user
// switching to BI silo because BI-Server doesn't mount those routes
// (only /api/v1/*). iPad screenshot evidence:
//   FetchEvent.respondWith received an error: no-response ::
//   https://bi-server.../api/crm/contacts?silo=bi
import { getActiveBusinessUnit } from "@/context/BusinessUnitContext";

const BF_SERVER_URL =
  import.meta.env.VITE_BF_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

const BI_SERVER_URL =
  import.meta.env.VITE_BI_API_URL ||
  "https://bi-server-cse0apamgkheb9d5.canadacentral-01.azurewebsites.net";

// Path prefixes that ONLY exist on BI-Server. Everything else is BF-Server.
const BI_SERVER_PATH_PREFIXES = [
  "/api/v1/bi/",
  "/api/v1/pgi/",
  "/api/v1/bi-",
];

function isBiServerPath(path?: string): boolean {
  if (!path) return false;
  return BI_SERVER_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Resolve the server base URL for a given path.
 * - /api/v1/bi/* | /api/v1/pgi/* | /api/v1/bi-* → BI-Server
 * - anything else → BF-Server (regardless of active silo)
 */
export function resolveApiBase(path?: string): string {
  if (isBiServerPath(path)) return BI_SERVER_URL;
  return BF_SERVER_URL;
}

/** @deprecated retained for legacy callers without a path. */
export function getApiBase(): string {
  return BF_SERVER_URL;
}

export function getActiveSilo(): string {
  return getActiveBusinessUnit() ?? "BF";
}

/** @deprecated retained for legacy callers; prefer resolveApiBase(). */
export const API_BASE = BF_SERVER_URL;

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid API path: "${path}" — must start with /`);
  }
  return `${resolveApiBase(path)}${path}`;
};

export const __apiBaseUrls = {
  bf: BF_SERVER_URL,
  bi: BI_SERVER_URL,
};
