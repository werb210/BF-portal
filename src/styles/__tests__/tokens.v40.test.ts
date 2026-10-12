// BF_PORTAL_TOKENS_v40 - globals.css is the portal's design system. A value
// here reaches every staff screen.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test: the stylesheet the app ships is applied in
// the DOM and the resolved custom properties / fonts are read back with getComputedStyle.
import { afterAll, afterEach, beforeAll, describe, it, expect } from "vitest";
import css from "@/styles/globals.css?raw";
import indexHtml from "../../../index.html?raw";

let style: HTMLStyleElement;
beforeAll(() => {
  style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
});
afterAll(() => style.remove());
afterEach(() => {
  document.documentElement.removeAttribute("data-silo");
  document.documentElement.removeAttribute("data-theme");
});

const rootVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Every declaration value in the sheet, including those inside @media blocks (comments excluded). */
function allDeclarations(): Array<{ prop: string; value: string }> {
  const out: Array<{ prop: string; value: string }> = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ("style" in rule) {
        const s = (rule as CSSStyleRule).style;
        for (let i = 0; i < s.length; i += 1) {
          const prop = s[i]!;
          out.push({ prop, value: s.getPropertyValue(prop) });
        }
      }
      if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  walk(style.sheet!.cssRules);
  return out;
}

describe("brand tokens", () => {
  it("uses the brand navy, mist, hairline and body colour", () => {
    expect(rootVar("--text-primary")).toBe("#0B1F3A");
    expect(rootVar("--panel-bg")).toBe("#F5F8FC");
    expect(rootVar("--ui-border")).toBe("#E4EAF2");
    expect(rootVar("--ui-text-muted")).toBe("#51617D");
  });

  it("dropped the generic values", () => {
    const values = allDeclarations().map((d) => d.value.toLowerCase());
    expect(values.length).toBeGreaterThan(100);
    for (const banned of ["#0b1220", "#cbd6e2", "#1e3a8a"]) {
      expect(values.filter((v) => v.includes(banned)), banned).toEqual([]);
    }
  });
});

describe("the silo signal survives", () => {
  it("keeps BI green and SLF amber", () => {
    document.documentElement.setAttribute("data-silo", "BI");
    expect(rootVar("--accent")).toBe("#2FA86A");
    document.documentElement.setAttribute("data-silo", "SLF");
    expect(rootVar("--accent")).toBe("#d97706");
  });

  it("moves only BF onto the brand navy", () => {
    document.documentElement.setAttribute("data-silo", "BF");
    expect(rootVar("--accent")).toBe("#0B1F3A");
  });

  it("keeps the semantic accents", () => {
    expect(rootVar("--ui-accent-red")).not.toBe("");
    expect(rootVar("--ui-accent-gold")).not.toBe("");
  });
});

describe("typeface", () => {
  it("runs Public Sans, not Inter", () => {
    expect(getComputedStyle(document.documentElement).fontFamily).toMatch(/^"Public Sans"/);
    const families = allDeclarations().filter((d) => d.prop === "font-family").map((d) => d.value);
    expect(families.filter((f) => /(^|,)\s*"?Inter"?\s*(,|$)/.test(f))).toEqual([]);
  });

  it("loads the faces without blocking render", () => {
    const doc = new DOMParser().parseFromString(indexHtml, "text/html");
    const fonts = Array.from(doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      .filter((l) => !l.closest("noscript") && (l.getAttribute("href") ?? "").includes("Public+Sans"));
    expect(fonts).toHaveLength(1);
    expect(fonts[0]!.getAttribute("media")).toBe("print");
  });
});
