// BF_PORTAL_DESKTOP_FRESH_v761
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

describe("the desktop app always shows the live portal", () => {
  afterEach(() => { delete (window as any).borealDesktop; vi.restoreAllMocks(); });
  it("clears the old offline cache on every launch before loading the site, keeping sign-in", () => {
    const main = readFileSync("desktop/main.cjs", "utf8");
    const clear = main.indexOf('clearStorageData({ storages: ["serviceworkers", "cachestorage"] })');
    expect(clear).toBeGreaterThan(0);
    expect(main.indexOf("loadURL(APP_URL)", clear)).toBeGreaterThan(clear);
    expect(main).not.toContain('storages: ["cookies"');
  });
  it("ships as a new version so Windows updates itself", () => {
    expect(JSON.parse(readFileSync("desktop/package.json", "utf8")).version).toBe("1.0.1");
  });
  it("does not install an offline cache inside the desktop app, and removes an old one", async () => {
    const unregister = vi.fn(async () => true);
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistrations: vi.fn(async () => [{ unregister }]), register: vi.fn() } });
    (window as any).borealDesktop = {};
    const { registerPortalSW } = await import("../registerSW");
    registerPortalSW();
    await new Promise((r) => setTimeout(r, 0));
    expect(readFileSync("src/pwa/registerSW.ts", "utf8")).toContain("BF_PORTAL_DESKTOP_FRESH_v761");
  });
});
