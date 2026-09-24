// BF_PORTAL_BLOCK_v478_BUILD_STAMP - values injected by vite.config.ts `define`.
// Guarded with typeof so tests and dev (no define) still work.
declare const __BUILD_SHA__: string | undefined;
declare const __BUILD_TIME__: string | undefined;

export function buildSha(): string {
  return typeof __BUILD_SHA__ === "string" && __BUILD_SHA__ ? __BUILD_SHA__ : "dev";
}

export function buildTime(): string | null {
  return typeof __BUILD_TIME__ === "string" && __BUILD_TIME__ ? __BUILD_TIME__ : null;
}

/** "Build 1a2b3c4 - Sep 24, 2:20 PM" in Alberta time. */
export function buildStampLabel(sha: string = buildSha(), iso: string | null = buildTime()): string {
  if (!iso) return `Build ${sha}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `Build ${sha}`;
  const when = d.toLocaleString("en-CA", {
    timeZone: "America/Edmonton", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  return `Build ${sha} - ${when}`;
}
