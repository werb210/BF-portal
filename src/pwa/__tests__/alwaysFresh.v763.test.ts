// BF_PORTAL_ALWAYS_FRESH_v763
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sw = readFileSync("src/sw.ts", "utf8");

describe("opening the portal always loads the newest build when online", () => {
  it("the start page is not answered from the saved copy", () => {
    expect(sw).toContain('precacheAndRoute(self.__WB_MANIFEST || [], { directoryIndex: "__never_serve_saved_index__", cleanURLs: false });');
  });
  it("navigations go network-first, falling back to the saved copy only when offline", () => {
    expect(sw).toContain("const navHandler = new NetworkFirst({");
    expect(sw.indexOf("precacheAndRoute(")).toBeLessThan(sw.indexOf("registerRoute(new NavigationRoute(navHandler"));
  });
});
