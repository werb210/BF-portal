// BF_PORTAL_BLOCK_v124c_DRAWER_TAB_CLIPPING_v1
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test: the shipped stylesheet is applied in the DOM
// and the drawer's elements are checked with getComputedStyle.
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import css from "@/styles/globals.css?raw";

describe("BF_PORTAL_BLOCK_v124c_DRAWER_TAB_CLIPPING_v1", () => {
  let style: HTMLStyleElement;
  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    document.body.innerHTML = `
      <div class="application-drawer">
        <div class="application-card">
          <div class="application-drawer__tabs"></div>
          <div class="application-card__content"></div>
        </div>
      </div>`;
  });
  afterAll(() => {
    style.remove();
    document.body.innerHTML = "";
  });
  const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);

  it(".application-card is a shrinkable flex column that clips its overflow", () => {
    const s = cs(".application-drawer > .application-card");
    expect(s.display).toBe("flex");
    expect(s.flexDirection).toBe("column");
    expect(s.minWidth).toBe("0");
    expect(s.flex).toBe("1 1 auto");
    expect(s.overflow).toBe("hidden");
  });

  it(".application-card__content scrolls and can shrink", () => {
    const s = cs(".application-card__content");
    expect(s.overflow).toBe("auto");
    expect(s.minWidth).toBe("0");
    expect(s.flex).toBe("1 1 auto");
  });

  it(".application-drawer__tabs scrolls horizontally and is never squeezed", () => {
    const s = cs(".application-drawer__tabs");
    expect(s.overflowX).toBe("auto");
    expect(s.flexShrink).toBe("0");
    expect(s.minWidth).toBe("0");
  });

  it(".application-card comes after .application-drawer__content in the cascade", () => {
    // Read from the parsed stylesheet (CSSOM): later rules of equal specificity win, so the card's
    // overflow: hidden overrides the drawer content's overflow-y: auto where both apply.
    // (jsdom does not resolve the overflow shorthand against an earlier overflow-y longhand, so this is
    // checked on the rule order rather than with getComputedStyle.)
    const selectors = Array.from(style.sheet!.cssRules).map((r) => (r as CSSStyleRule).selectorText ?? "");
    const drawerContent = selectors.indexOf(".application-drawer__content");
    const card = selectors.indexOf(".application-card");
    expect(drawerContent).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(drawerContent);
  });

  // Dropped: "anchor present in globals.css" (a comment marker, no behaviour) and "no JS/TSX file was
  // modified" (it only re-checked that the .application-card rule exists, covered above).
});
