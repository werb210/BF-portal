// BF_PORTAL_DIALER_HANDOFF_v424
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("v424 Portal calls route through the Boreal Dialer", () => {
  it("declares the scheme iOS requires before canOpenURL will work", () => {
    const plist = read("ios/App/App/Info.plist");
    expect(plist).toContain("LSApplicationQueriesSchemes");
    expect(plist).toContain("borealdialer");
  });

  it("falls back to tel: when the Dialer is absent", () => {
    const src = read("src/native/dialerLauncher.ts");
    expect(src).toContain("canOpenUrl");
    expect(src).toContain("tel:${number}");
  });

  it("prefers contactId over a bare number when one is known", () => {
    expect(read("src/native/dialerLauncher.ts")).toContain("contactId ? { contactId }");
  });

  it("no screen hands a call straight to the OS dialer any more", () => {
    for (const p of [
      "src/pages/applications/tabs/ApplicationTab.tsx",
      "src/pages/tasks/TaskRunner.tsx",
      "src/pages/diagnostics/DiagnosticsPage.tsx",
    ]) {
      if (!existsSync(path.join(process.cwd(), p))) continue;
      expect(read(p)).not.toMatch(/href=\{`tel:\$\{/);
      expect(read(p)).toContain("placeCall(");
    }
  });
});
