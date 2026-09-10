// BF_PORTAL_JOB_QUEUE_PATH_v1
// This panel has now shipped three broken path conventions: no /api prefix,
// and an /_int path the browser cannot reach (no CORS header, net::ERR_FAILED).
// Pin all three rules so a fourth tab cannot repeat any of them.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "..", "DiagnosticsPage.tsx"), "utf-8");
const calls = [...page.matchAll(/apiClient\.get<[^>]*>\(\s*[`"]([^`"$]*)/g)].map((m) => m[1]);

describe("BF_PORTAL_JOB_QUEUE_PATH_v1", () => {
  it("makes at least one request", () => {
    expect(calls.length).toBeGreaterThan(0);
  });

  it.each(calls)("%s carries the /api prefix", (p) => {
    expect(p.startsWith("/api/")).toBe(true);
  });

  it.each(calls)("%s is not an internal path", (p) => {
    expect(
      p.startsWith("/api/_int/"),
      `${p} is internal - the browser receives no CORS header and the request fails`,
    ).toBe(false);
  });

  it.each(calls)("%s is not routed to BI-Server", (p) => {
    expect(p.startsWith("/api/v1/")).toBe(false);
  });
});
