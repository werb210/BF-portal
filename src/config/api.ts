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

// BF_PORTAL_BLOCK_v_SLF_SERVER_ROUTING_v1 - SLF silo data lives on slf-server
// (its own deployment, its own DB), exactly like BI lives on bi-server. Only
// paths under /api/slf/* go to slf-server; shared shell paths (auth, users,
// telephony) stay on BF-Server.
const SLF_SERVER_URL =
  import.meta.env.VITE_SLF_API_URL ||
  "https://slf-server-gcazhvawa0a8habt.canadacentral-01.azurewebsites.net";

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

function isSlfServerPath(path?: string): boolean {
  if (!path) return false;
  return path === "/api/slf" || path.startsWith("/api/slf/") || path.startsWith("/api/slf?");
}

/**
 * Resolve the server base URL for a given path.
 * - /api/v1/bi/* | /api/v1/pgi/* | /api/v1/bi-* → BI-Server
 * - anything else → BF-Server (regardless of active silo)
 */
export function resolveApiBase(path?: string): string {
  if (isSlfServerPath(path)) return SLF_SERVER_URL;
  if (isBiServerPath(path)) return BI_SERVER_URL;
  return BF_SERVER_URL;
}

/** @deprecated retained for legacy callers without a path. */
export function getApiBase(): string {
  return BF_SERVER_URL;
}

// BF_PORTAL_v850_KS_CRM - the Keystone CRM (/silo/ks/crm/*) reuses the BF CRM screens with silo KS. While one of its pages
// is open, the CRM and communications calls (the paths below) carry X-Silo: KS; everything else - users, settings,
// templates, BI-Server and SLF paths - keeps the BF/BI/SLF silo chosen in the topbar. Other pages are unchanged.
export const KS_CRM_PAGE_PREFIX = "/silo/ks/crm";
const KS_SCOPED_API_PREFIXES = [
  "/api/crm",
  "/api/ks",
  "/api/communications",
  "/api/tasks",
  "/api/meetings",
  "/api/voice",
  "/api/telephony",
  "/api/calls",
  "/api/o365/mail",
  "/api/companies",
  "/api/contacts",
  "/api/recipients",
];

export function isKsCrmPage(pathname?: string | null): boolean {
  let p = pathname;
  if (p == null) {
    try {
      p = typeof window === "undefined" ? "" : window.location.pathname;
    } catch {
      p = "";
    }
  }
  return p === KS_CRM_PAGE_PREFIX || String(p).startsWith(KS_CRM_PAGE_PREFIX + "/");
}

export function isKsScopedApiPath(path: string): boolean {
  const p = (path.startsWith("/") ? path : `/${path}`).split("?")[0] ?? "";
  return KS_SCOPED_API_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"));
}

/** "KS" while a Keystone CRM page is open, otherwise null. */
export function ksCrmSilo(): "KS" | null {
  return isKsCrmPage() ? "KS" : null;
}

export function getActiveSilo(path?: string): string {
  if (path !== undefined && isKsScopedApiPath(path) && isKsCrmPage()) return "KS"; // BF_PORTAL_v850_KS_CRM
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
  slf: SLF_SERVER_URL,
};
