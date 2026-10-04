// BF_PORTAL_DASHBOARD_CONTRAST_v733
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CARD_BG, CARD_TEXT } from "../DashboardHome";

function lum(hex: string) { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; }
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe("Dashboard text is readable", () => {
  it("cards use fixed navy text on white, well above the 4.5:1 minimum", () => {
    expect(ratio(CARD_TEXT, CARD_BG)).toBeGreaterThan(12);
    expect(ratio("#51617D", CARD_BG)).toBeGreaterThan(4.5);
  });
  it("text never inherits a page or theme colour", () => {
    const s = readFileSync("src/pages/dashboard/DashboardHome.tsx", "utf8");
    expect(s).toContain("const box: CSSProperties = { background: CARD_BG, color: CARD_TEXT,");
    expect(s).toContain('data-testid="dashboard-home" style={{ color: CARD_TEXT }}');
  });
});
