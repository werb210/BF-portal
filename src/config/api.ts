/**
 * BI_HARD_ISOLATION_v59 — silo-based routing.
 *
 * Old (BF_SILO_API_ROUTING_v43): `/api/v1/*` paths went to BI-Server, all
 * other paths went to BF-Server. The path prefix decided.
 *
 * Now: the active silo decides. Every API call made while the user is in
 * the BI silo goes to BI-Server. Every call made while in BF or SLF goes
 * to BF-Server. URL path is irrelevant.
 *
 * Why: shared shell widgets (topbar, floating chat, telephony presence,
 * /api/users/me, etc.) used to call BF-Server even while the user was on
 * /bi/pipeline — silent cross-silo bleed. Silo-based routing closes that.
 *
 * Consequence: shared shell widgets that don't yet have a BI-Server
 * equivalent will receive 404s in BI silo. That's the architecture
 * surfacing itself — we either build BI counterparts on BI-Server, or
 * hide those widgets in BI silo. Either choice is a follow-up PR.
 */
import { getActiveBusinessUnit } from "@/context/BusinessUnitContext";

const BF_SERVER_URL =
  import.meta.env.VITE_BF_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

const BI_SERVER_URL =
  import.meta.env.VITE_BI_API_URL ||
  "https://bi-server-cse0apamgkheb9d5.canadacentral-01.azurewebsites.net";

/**
 * Resolve the server base URL for the current request.
 *
 * BI silo  → BI-Server (always)
 * BF silo  → BF-Server (always)
 * SLF silo → BF-Server (always — BF and SLF share one server)
 *
 * The `path` argument is accepted for API compatibility with prior callers
 * but is intentionally not used. Path prefix no longer routes.
 */
export function resolveApiBase(_path?: string): string {
  return getActiveBusinessUnit() === "BI" ? BI_SERVER_URL : BF_SERVER_URL;
}

/**
 * @deprecated Prior callers used this when they didn't have a path yet.
 * Returns the silo-correct base for the current active silo.
 */
export function getApiBase(): string {
  return resolveApiBase();
}

export function getActiveSilo(): string {
  return getActiveBusinessUnit() ?? "BF";
}

/** @deprecated retained for legacy callers; prefer resolveApiBase(). */
export const API_BASE = BF_SERVER_URL;

/** Build a full URL for a path, routing to the silo-correct server. */
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
