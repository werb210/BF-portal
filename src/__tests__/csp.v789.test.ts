// BF_PORTAL_v789_CSP - script-src allows neither eval nor inline script, and the shell page needs neither.
import { describe, it, expect } from "vitest";
import rootConfig from "../../staticwebapp.config.json";
import publicConfig from "../../public/staticwebapp.config.json";
import indexHtml from "../../index.html?raw";
import fontSwap from "../../public/font-swap.js?raw";

function directive(csp: string, name: string): string[] {
  const part = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  return part ? part.split(/\s+/).slice(1) : [];
}

describe("Content-Security-Policy", () => {
  const csp = rootConfig.globalHeaders["Content-Security-Policy"];

  it("script-src has no 'unsafe-eval' or 'unsafe-inline'", () => {
    const scripts = directive(csp, "script-src");
    expect(scripts).toEqual(["'self'"]);
  });

  it("the copy Vite ships in dist is the same policy", () => {
    expect(publicConfig.globalHeaders["Content-Security-Policy"]).toBe(csp);
  });

  it("index.html has no inline script or inline event handler", () => {
    const doc = new DOMParser().parseFromString(indexHtml, "text/html");
    for (const s of Array.from(doc.querySelectorAll("script"))) {
      expect(s.getAttribute("src"), s.outerHTML).toBeTruthy();
      expect(s.textContent?.trim()).toBe("");
    }
    for (const el of Array.from(doc.querySelectorAll("*"))) {
      for (const attr of Array.from(el.attributes)) expect(attr.name.startsWith("on"), `${el.tagName} ${attr.name}`).toBe(false);
    }
  });

  it("the font stylesheet still switches to media=all once loaded", () => {
    document.head.innerHTML = '<link rel="stylesheet" href="x.css" media="print" data-font-swap>';
    const link = document.querySelector("link") as HTMLLinkElement;
    new Function(fontSwap)();
    expect(link.media).toBe("print");
    link.dispatchEvent(new Event("load"));
    expect(link.media).toBe("all");
  });
});
