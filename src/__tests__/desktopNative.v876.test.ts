// BF_PORTAL_v876_NATIVE_DESKTOP - the native desktop app's build inputs: the Boreal brand (name, bundle id, portal
// address), the Tauri config overlay (updater, signing), the macOS entitlements (Associated Domains only with a
// provisioning profile), the capability that lets only the portal call the app, the updater manifest, and the
// portal's apple-app-site-association.
import { describe, expect, it, vi } from "vitest";
import {
  appleAppSiteAssociation, entitlementsPlist, portalCapability, releaseNames, resolveBrand, runtimeBrand, tauriOverlay,
  updaterManifest,
} from "../../desktop/native/brand-lib.mjs";
import aasa from "../../public/.well-known/apple-app-site-association?raw";
import bridgeJs from "../../desktop/native/src-tauri/bridge.js?raw";
import boreal from "../../desktop/native/brands/boreal.json";
import tauriConf from "../../desktop/native/src-tauri/tauri.conf.json";

describe("native desktop app brand", () => {
  it("opens the Boreal staff portal and lets only that origin call the app", () => {
    const brand = resolveBrand(boreal, {});
    expect(runtimeBrand(brand)).toEqual({ app_name: "Boreal Staff Portal", portal_url: "https://staff.boreal.financial", ops_url: "" });
    expect(portalCapability(brand).remote.urls).toEqual(["https://staff.boreal.financial/*"]);
    expect(portalCapability(brand).permissions).toEqual(["allow-incoming-call", "allow-set-badge", "allow-notify", "allow-open-external"]);
    expect(releaseNames(brand)).toEqual({ tag: "desktop-boreal-v2.0.0", manifest: "latest-boreal.json", channel: "desktop-latest" });
    expect(tauriConf.identifier).toBe(brand.bundle_id);
    expect(tauriConf.app.windows).toEqual([]);
  });

  it("refuses a bad bundle id or a non-https portal", () => {
    expect(() => resolveBrand(boreal, { DESKTOP_BUNDLE_ID: "Not A Bundle" })).toThrow(/bundle_id/);
    expect(() => resolveBrand(boreal, { DESKTOP_PORTAL_URL: "http://staff.boreal.financial" })).toThrow(/https/);
  });

  it("turns on the updater only with a public key", () => {
    const brand = resolveBrand(boreal, {});
    expect(tauriOverlay(brand).bundle.createUpdaterArtifacts).toBe(false);
    const on = tauriOverlay(brand, { updaterPubkey: "PUBKEY", windowsThumbprint: "ab cd" });
    expect(on.bundle.createUpdaterArtifacts).toBe(true);
    expect(on.plugins.updater.endpoints).toEqual(["https://github.com/werb210/BF-portal/releases/download/desktop-latest/latest-boreal.json"]);
    expect(on.bundle.windows.certificateThumbprint).toBe("ABCD");
  });

  it("adds Associated Domains (passkeys, code AutoFill) only with a provisioning profile and Team ID", () => {
    const brand = resolveBrand(boreal, {});
    expect(entitlementsPlist(brand, { teamId: "ABCDE12345" })).not.toContain("associated-domains");
    const withProfile = entitlementsPlist(brand, { teamId: "ABCDE12345", provisioned: true });
    expect(withProfile).toContain("<string>webcredentials:staff.boreal.financial</string>");
    expect(withProfile).toContain("<string>ABCDE12345.com.boreal.portal.desktop</string>");
  });

  it("writes the update manifest for both Mac chips and Windows", () => {
    const m = updaterManifest({
      version: "2.0.0",
      files: {
        "darwin-universal": { url: "https://example/mac.app.tar.gz", signature: "SIGMAC" },
        "windows-x86_64": { url: "https://example/setup.exe", signature: "SIGWIN" },
      },
    });
    expect(Object.keys(m.platforms).sort()).toEqual(["darwin-aarch64", "darwin-x86_64", "windows-x86_64"]);
  });
});

describe("portal apple-app-site-association", () => {
  it("keeps the iPad app and adds the Mac desktop app (Team 76VAY7UJKJ), in the shape brand-lib builds", () => {
    const served = JSON.parse(aasa);
    expect(served.webcredentials.apps).toEqual(["76VAY7UJKJ.com.borealfinancial.portal", "76VAY7UJKJ.com.boreal.portal.desktop"]);
    expect(served.applinks).toEqual(appleAppSiteAssociation(["76VAY7UJKJ.com.boreal.portal.desktop"]).applinks);
    expect(appleAppSiteAssociation("bad").webcredentials.apps).toEqual([]);
  });
});

// The bridge the app injects before any page script: the same window.borealDesktop surface the Electron preload gave
// the portal (src/desktop/DesktopBridge.tsx calls incomingCall and setBadge), run here against a stand-in window.
function runBridge(href: string, platform = "MacIntel") {
  const invoke = vi.fn(async (_cmd: string, _args?: unknown) => undefined);
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const win: Record<string, any> = {
    location: new URL(href),
    __TAURI_INTERNALS__: { invoke },
    sessionStorage: storage,
    localStorage: storage,
    addEventListener: vi.fn(),
  };
  const nav = { platform, userAgent: platform };
  new Function("window", "navigator", bridgeJs)(win, nav);
  return { win, invoke };
}

describe("desktop bridge (window.borealDesktop)", () => {
  it("gives the portal incomingCall and setBadge, trimmed and clamped, sent to the app", () => {
    const { win, invoke } = runBridge("https://staff.boreal.financial/dashboard");
    expect(win.borealDesktop.native).toBe(true);
    expect(win.borealDesktop.platform).toBe("mac");
    win.borealDesktop.incomingCall({ name: "x".repeat(200), detail: "Boreal Financial" });
    expect(invoke).toHaveBeenCalledWith("incoming_call", { name: "x".repeat(120), detail: "Boreal Financial" });
    win.borealDesktop.setBadge(5000);
    expect(invoke).toHaveBeenCalledWith("set_badge", { count: 999 });
    win.borealDesktop.setBadge(-3);
    expect(invoke).toHaveBeenCalledWith("set_badge", { count: 0 });
  });

  it("turns web notifications into native ones, already allowed", async () => {
    const { win, invoke } = runBridge("https://staff.boreal.financial/", "Win32");
    expect(win.borealDesktop.platform).toBe("windows");
    expect(win.Notification.permission).toBe("granted");
    await expect(win.Notification.requestPermission()).resolves.toBe("granted");
    new win.Notification("New message", { body: "From Andrew" });
    expect(invoke).toHaveBeenCalledWith("notify", { title: "New message", body: "From Andrew" });
  });

  it("gives Microsoft sign-in pages and the app's own start page nothing", () => {
    expect(runBridge("https://login.microsoftonline.com/common/oauth2").win.borealDesktop).toBeUndefined();
    expect(runBridge("https://tauri.localhost/index.html").win.borealDesktop).toBeUndefined();
  });
});
