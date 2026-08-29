// BF_PORTAL_CSP_ALLOW_GOOGLE_FONTS_v137
// index.html has requested Google Fonts since v40 and the CSP never allowed it,
// so every load of the portal refused the stylesheet and the dashboard rendered
// untyped. These assert the two are consistent with each other, in both copies
// of the config - public/ is the one Vite ships, the root one is what the repo
// reads as canonical, and they drift silently if only one is edited.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const CONFIGS = ["staticwebapp.config.json", "public/staticwebapp.config.json"];
const html = read("index.html");

describe("the CSP allows what index.html actually asks for", () => {
  it.each(CONFIGS)("%s style-src allows the fonts stylesheet", (f) => {
    const csp: string = JSON.parse(read(f)).globalHeaders["Content-Security-Policy"];
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
  });

  it.each(CONFIGS)("%s font-src allows the font files the stylesheet pulls", (f) => {
    const csp: string = JSON.parse(read(f)).globalHeaders["Content-Security-Policy"];
    expect(csp).toContain("https://fonts.gstatic.com");
  });

  it.each(CONFIGS)("%s keeps every origin it already allowed", (f) => {
    const csp: string = JSON.parse(read(f)).globalHeaders["Content-Security-Policy"];
    for (const origin of [
      "https://server.boreal.financial",
      "https://login.microsoftonline.com",
      "https://app.signnow.com",
      "wss://server.boreal.financial",
    ]) {
      expect(csp).toContain(origin);
    }
  });

  it("the two configs have not drifted apart", () => {
    const [a, b] = CONFIGS.map((f) => JSON.parse(read(f)).globalHeaders["Content-Security-Policy"]);
    expect(a).toBe(b);
  });
});

describe("every external origin index.html references is allowed", () => {
  it("finds the font origins in the html, so the test is anchored to reality", () => {
    expect(html).toContain("https://fonts.googleapis.com/css2");
    expect(html).toContain("https://fonts.gstatic.com");
  });

  it("no other third-party origin has crept into index.html unallowed", () => {
    const csp: string = JSON.parse(read(CONFIGS[1])).globalHeaders["Content-Security-Policy"];
    const origins = new Set(
      Array.from(html.matchAll(/https:\/\/([a-z0-9.-]+)/gi)).map((m) => m[1].toLowerCase()),
    );
    const unallowed = [...origins].filter((o) => !csp.includes(o));
    expect(unallowed).toEqual([]);
  });
});
