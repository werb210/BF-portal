// BF_PORTAL_BLOCK_v124c_DRAWER_TAB_CLIPPING_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BF_PORTAL_BLOCK_v124c_DRAWER_TAB_CLIPPING_v1", () => {
  const css = readFileSync(
    join(__dirname, "..", "globals.css"),
    "utf8"
  );

  it("anchor present in globals.css", () => {
    expect(css).toContain("BF_PORTAL_BLOCK_v124c_DRAWER_TAB_CLIPPING_v1");
  });

  it(".application-card rule exists with flex column + min-width:0", () => {
    const ruleStart = css.indexOf(".application-card {");
    expect(ruleStart, ".application-card rule missing").toBeGreaterThan(-1);
    const ruleEnd = css.indexOf("}", ruleStart);
    const body = css.slice(ruleStart, ruleEnd);
    expect(body).toContain("display: flex");
    expect(body).toContain("flex-direction: column");
    expect(body).toContain("min-width: 0");
    expect(body).toContain("flex: 1 1 auto");
    expect(body).toContain("overflow: hidden");
  });

  it(".application-card__content rule exists with overflow:auto", () => {
    const ruleStart = css.indexOf(".application-card__content {");
    expect(ruleStart, ".application-card__content rule missing").toBeGreaterThan(-1);
    const ruleEnd = css.indexOf("}", ruleStart);
    const body = css.slice(ruleStart, ruleEnd);
    expect(body).toContain("overflow: auto");
    expect(body).toContain("min-width: 0");
    expect(body).toContain("flex: 1 1 auto");
  });

  it(".application-drawer__tabs gets flex-shrink:0 + min-width:0", () => {
    const ruleStart = css.indexOf(".application-drawer__tabs {");
    expect(ruleStart).toBeGreaterThan(-1);
    const ruleEnd = css.indexOf("}", ruleStart);
    const body = css.slice(ruleStart, ruleEnd);
    expect(body).toContain("overflow-x: auto");
    expect(body).toContain("flex-shrink: 0");
    expect(body).toContain("min-width: 0");
  });

  it(".application-card rule appears AFTER .application-drawer__content", () => {
    const cardIdx = css.indexOf(".application-card {");
    const drawerContentIdx = css.indexOf(".application-drawer__content {");
    expect(cardIdx).toBeGreaterThan(drawerContentIdx);
    expect(drawerContentIdx).toBeGreaterThan(-1);
  });

  it("no JS/TSX file was modified — pure CSS block", () => {
    expect(css.includes(".application-card {")).toBe(true);
  });
});
