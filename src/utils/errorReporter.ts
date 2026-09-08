// BF_PORTAL_ERROR_REPORTING_v1
// Every error path in the portal ended at console.error: the logger writes to
// console only, and main.tsx's unhandledrejection/error handlers do the same.
// Production failures therefore left no trace anywhere reachable. BF-Server
// already exposes POST /api/client/issues and api/maya.ts already posts to it.
import { getAuthToken } from "@/lib/authToken";

const ENDPOINT = "/api/client/issues";
const MAX_PER_SESSION = 20;
const DEDUPE_WINDOW_MS = 60_000;

const seen = new Map<string, number>();
let sent = 0;

/** Test seam. */
export function __resetErrorReporter(): void {
seen.clear();
sent = 0;
}

function fingerprint(message: string, stack?: string): string {
// Stack frames carry line numbers that shift between builds; the top frame
// plus the message is stable enough to collapse a repeating error.
return `${message}::${(stack ?? "").split("\n")[1]?.trim() ?? ""}`;
}

export function shouldReport(message: string, stack: string | undefined, now = Date.now()): boolean {
if (sent >= MAX_PER_SESSION) return false;
const key = fingerprint(message, stack);
const last = seen.get(key);
// A render loop can throw hundreds of times a second. One report is enough.
if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;
seen.set(key, now);
return true;
}

export function reportError(
source: "boundary" | "unhandledrejection" | "runtime",
error: unknown,
context?: Record<string, unknown>,
): void {
const err = error instanceof Error ? error : new Error(String(error ?? "Unknown error"));
if (!shouldReport(err.message, err.stack)) return;
sent += 1;

const body = JSON.stringify({
source,
message: err.message,
stack: err.stack?.slice(0, 4000) ?? null,
url: typeof window !== "undefined" ? window.location.pathname : null,
userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
context: context ?? null,
});

// Fire-and-forget. A reporting failure must never surface to the user, and
// must never re-enter this function -- that is how an error reporter becomes
// the outage.
try {
void fetch(ENDPOINT, {
method: "POST",
keepalive: true,
headers: {
"Content-Type": "application/json",
...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
},
body,
}).catch(() => undefined);
} catch {
/* reporting is best-effort by design */
}
}
