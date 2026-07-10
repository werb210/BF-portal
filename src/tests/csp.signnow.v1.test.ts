// BF_PORTAL_CSP_ALLOW_SIGNNOW_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("CSP allows the SignNow signing iframe", () => {
  for (const f of ["staticwebapp.config.json", "public/staticwebapp.config.json"]) {
    it(`${f} frame-src includes app.signnow.com`, () => {
      const cfg = JSON.parse(read(f));
      const csp: string = cfg.globalHeaders["Content-Security-Policy"];
      expect(csp).toContain("frame-src");
      expect(csp).toContain("https://app.signnow.com");
      // still allows the existing entries
      expect(csp).toContain("https://login.microsoftonline.com");
    });
  }
});
