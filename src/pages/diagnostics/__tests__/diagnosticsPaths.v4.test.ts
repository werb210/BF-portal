// BF_PORTAL_DIAGNOSTICS_API_PREFIX_v4
// The panel shipped, rendered, and every tab said "Route not found" because
// the request paths omitted /api. apiClient adds the origin and nothing else.
// Pin the convention so a future request cannot repeat it.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "..", "DiagnosticsPage.tsx"), "utf-8");

describe("BF_PORTAL_DIAGNOSTICS_API_PREFIX_v4", () => {
  const calls = [...page.matchAll(/apiClient\.get<[^>]*>\(\s*[`"]([^`"$]*)/g)].map((m) => m[1]!);

  it("makes exactly the five expected requests", () => {
    expect(calls).toHaveLength(5);
  });

  it.each(calls)("%s carries the /api prefix", (path) => {
    expect(path.startsWith("/api/"), `${path} would hit the origin root and 404`).toBe(true);
  });

  it.each(calls)("%s is not routed to BI-Server", (path) => {
    // resolveApiBase sends /api/v1/bi/* to BI-Server; these are BF-Server routes.
    expect(path.startsWith("/api/v1/")).toBe(false);
  });
});
