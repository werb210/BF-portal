// BF_PORTAL_BOOKING_BTN_v47 - the booking button was declared three times on
// the old indigo, while BF-Server v70 emits the same button on brand navy.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/components/communications/O365ComposeModal.tsx", "utf8");

describe("the button is on brand", () => {
  it("uses the brand navy", () => {
    expect(SRC).toContain("background:#0B1F3A");
  });

  it("has no indigo left anywhere", () => {
    expect(SRC).not.toContain("#1E3A8A");
  });
});

describe("it is declared once", () => {
  it("the style lives in the constant", () => {
    expect(SRC).toContain("const BOOKING_BTN_STYLE =");
  });

  it("every call site references it rather than repeating it", () => {
    // Four: three booking-button builders plus the sanitizer that rewrites a
    // pasted button back onto the house style.
    expect(SRC.match(/style="\$\{BOOKING_BTN_STYLE\}"/g)?.length).toBe(4);
  });

  it("the full style string appears only in the constant", () => {
    const full = "display:inline-block;margin:4px 0;padding:10px 18px;background:#0B1F3A";
    expect(SRC.split(full).length - 1).toBe(1);
  });
});

describe("the toolbar colour picker is on brand too", () => {
  it("defaults to navy, not the old indigo", () => {
    expect(SRC).toContain('defaultValue="#0B1F3A"');
  });
});

describe("it matches what the server emits", () => {
  // BF-Server v70 renders {{meeting_link}} with the same padding, radius,
  // weight and face. If either side changes, change both.
  for (const part of [
    "padding:10px 18px",
    "border-radius:6px",
    "font-weight:600",
    "font-family:Segoe UI,Arial,sans-serif",
  ]) {
    it(`keeps ${part}`, () => {
      expect(SRC).toContain(part);
    });
  }
});
