// BF_PORTAL_TOKENS_v40 - globals.css is the portal's design system. A value
// here reaches every staff screen.
import { describe, it, expect } from "vitest";
import fs from "fs";

const CSS = fs.readFileSync("src/styles/globals.css", "utf8");
const HTML = fs.readFileSync("index.html", "utf8");

describe("brand tokens", () => {
  it("uses the brand navy, mist, hairline and body colour", () => {
    expect(CSS).toContain("--text-primary: #0B1F3A;");
    expect(CSS).toContain("--panel-bg: #F5F8FC;");
    expect(CSS).toContain("--ui-border: #E4EAF2;");
    expect(CSS).toContain("--ui-text-muted: #51617D;");
  });

  it("dropped the generic values", () => {
    expect(CSS).not.toContain("#0b1220");
    expect(CSS).not.toContain("#cbd6e2");
    expect(CSS).not.toContain("#1E3A8A");
  });
});

describe("the silo signal survives", () => {
  it("keeps BI green and SLF amber", () => {
    expect(CSS).toContain(':root[data-silo="BI"]  { --accent: #2FA86A;');
    expect(CSS).toContain(':root[data-silo="SLF"] { --accent: #d97706;');
  });

  it("moves only BF onto the brand navy", () => {
    expect(CSS).toContain(':root[data-silo="BF"]  { --accent: #0B1F3A;');
  });

  it("keeps the semantic accents", () => {
    expect(CSS).toContain("--ui-accent-red");
    expect(CSS).toContain("--ui-accent-gold");
  });
});

describe("typeface", () => {
  it("runs Public Sans, not Inter", () => {
    expect(CSS).toContain('font-family: "Public Sans"');
    expect(CSS).not.toContain('font-family: "Inter"');
  });

  it("loads the faces without blocking render", () => {
    expect(HTML).toContain("Public+Sans");
    expect(HTML).toContain('media="print"');
  });
});
