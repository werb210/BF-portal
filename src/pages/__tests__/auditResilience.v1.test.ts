// BF_PORTAL_AUDIT_RESILIENCE_v1
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const pages = ["AuditLogs.tsx", "AdminActivity.tsx"].map((f) => ({
  name: f,
  src: fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"),
}));

describe("one dead log source cannot blank the page", () => {
  for (const { name, src } of pages) {
    it(`${name} does not reject on the first failing source`, () => {
      expect(src).toContain("Promise.allSettled");
      expect(src).not.toMatch(/await Promise\.all\(\[/);
    });
  }

  it("AuditLogs clears loading even if the loader throws", () => {
    const src = pages[0]!.src;
    expect(src).toMatch(/void loadLogs\(\)\.catch\(\(\) => setIsLoading\(false\)\)/);
  });

  it("AuditLogs tells the user the rows are incomplete", () => {
    expect(pages[0]!.src).toContain("audit-source-error");
    expect(pages[0]!.src).toContain("incomplete");
  });

  it("still renders whichever source succeeded", () => {
    const src = pages[0]!.src;
    expect(src).toContain('biResult.status === "fulfilled" ? biResult.value : []');
    expect(src).toContain('slfResult.status === "fulfilled" ? slfResult.value : []');
  });
});
