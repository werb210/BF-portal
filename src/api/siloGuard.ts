// BF_PORTAL_v789_SILO_GUARD - moved here from lib/siloGuard.ts, where only unreachable code called it.
// Every response the live api client returns is checked: when a record carries a `silo` that is not the
// silo the user is working in, the response is refused with a SiloMismatchError and reported, so BF
// data can never be shown on a BI screen (or the reverse) because of a server-side scoping mistake.
// Endpoints that are cross-silo on purpose (admin, global, the signed-in user, reports, automations)
// are listed below and skipped.
import { reportError } from "@/utils/errorReporter";

export class SiloMismatchError extends Error {
  readonly path: string;
  readonly expected: string;
  readonly received: string;
  constructor(path: string, expected: string, received: string) {
    super(`Cross-silo data blocked: ${path} returned ${received} data in the ${expected} silo.`);
    this.name = "SiloMismatchError";
    this.path = path;
    this.expected = expected;
    this.received = received;
  }
}

/** Deliberately cross-silo endpoints (path prefixes). Their responses may mix silos. */
export const CROSS_SILO_ALLOWLIST: readonly RegExp[] = [
  /^\/api\/admin(\/|\?|$)/, // admin tools look across every silo
  /^\/api\/global(\/|\?|$|-)/, // global admin / global search
  /^\/api\/auth(\/|\?|$)/, // the signed-in user's home silo
  /^\/api\/users(\/|\?|$)/, // staff and their silos (user management, /api/users/me)
  /^\/api\/team(\/|\?|$)/, // team chat is shared by every silo
  /^\/api\/reports(\/|\?|$)/, // the report catalogue lists every silo's reports
  /^\/api\/automations(\/|\?|$)/, // workflows are built for any silo from one editor
  /^\/api\/audit(\/|\?|$|-)/, // audit logs
  /^\/api\/client\/issues(\/|\?|$)/, // error reports
];

export function isCrossSiloPath(path: string): boolean {
  const p = path.startsWith("/") ? path : `/${path}`;
  return CROSS_SILO_ALLOWLIST.some((re) => re.test(p));
}

const norm = (s: string) => s.trim().toUpperCase();

function siloOf(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const silo = (value as { silo?: unknown }).silo;
  return typeof silo === "string" && silo.trim() ? silo : null;
}

/** The first silo in `data` that differs from `expected`: the record itself, list rows, or rows in items/rows/results. */
export function findSiloMismatch(data: unknown, expected: string): string | null {
  const want = norm(expected);
  const check = (v: unknown) => {
    const s = siloOf(v);
    return s && norm(s) !== want ? s : null;
  };
  const rows = (list: unknown): string | null => {
    if (!Array.isArray(list)) return null;
    for (const row of list) {
      const bad = check(row);
      if (bad) return bad;
    }
    return null;
  };
  if (Array.isArray(data)) return rows(data);
  const own = check(data);
  if (own) return own;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    return rows(rec.items) ?? rows(rec.rows) ?? rows(rec.results);
  }
  return null;
}

/** Throws (and reports) when a silo-scoped response carries another silo's data. */
export function assertSiloScoped(path: string, data: unknown, expected: string): void {
  if (!expected || isCrossSiloPath(path.split("?")[0] ?? path)) return;
  const received = findSiloMismatch(data, expected);
  if (!received) return;
  const error = new SiloMismatchError(path.split("?")[0] ?? path, norm(expected), norm(received));
  reportError("runtime", error, { kind: "silo_mismatch", path: error.path, expected: error.expected, received: error.received });
  throw error;
}
