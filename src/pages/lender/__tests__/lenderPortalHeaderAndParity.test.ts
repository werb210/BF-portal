// LENDER_HEADER_WHITE_v2 - header text and logo are hard-white on the navy
// header (was var(--ui-text) = dark on dark), and Country has field parity
// with the staff lender form.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(path.join(process.cwd(), "src", "pages", "lender", "LenderPortalPage.tsx"), "utf-8");

describe("lender portal header contrast", () => {
  it("group name is white", () => {
    expect(page).toContain('color: "#ffffff" }}>Boreal Financial Group');
  });
  it("welcome line is white", () => {
    expect(page).toContain('color: "rgba(255,255,255,0.85)"');
  });
  it("logo is forced white", () => {
    expect(page).toContain('filter: "brightness(0) invert(1)"');
  });
});

describe("lender portal field parity", () => {
  it("country shows in company info and in the edit form", () => {
    const hits = page.split('{ key: "country", label: "Country" }').length - 1;
    expect(hits).toBe(2);
  });
});
