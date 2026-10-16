// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test. The native (Swift / Xcode) side cannot run
// under Vitest, so its files are imported as data and checked against what the JS side actually calls.
import { beforeEach, describe, expect, it, vi } from "vitest";
import pluginSwift from "../../../ios/App/App/WidgetBridgePlugin.swift?raw";
import bridgeSwift from "../../../ios/App/App/BorealBridgeViewController.swift?raw";
import summaryWidgetSwift from "../../../ios/App/BorealWidget/SummaryWidget.swift?raw";
import entitlements from "../../../ios/App/App/App.entitlements?raw";
import pbxproj from "../../../ios/App/App.xcodeproj/project.pbxproj?raw";

const h = vi.hoisted(() => ({
  native: true,
  platform: "ios",
  setItem: vi.fn(async () => {}),
  removeItem: vi.fn(async () => {}),
  getItem: vi.fn(async () => ({ value: null as string | null })),
  reloadAllTimelines: vi.fn(async () => {}),
  reloadTimelines: vi.fn(async () => {}),
  registered: [] as string[],
  preferences: vi.fn(),
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: new Proxy({}, { get: (_t, prop) => (...args: unknown[]) => h.preferences(prop, ...args) }),
}));
vi.mock("@/api", () => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  return { api: apiFn, default: apiFn, rawApiFetch: vi.fn() };
});

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => h.native,
    getPlatform: () => h.platform,
  },
  registerPlugin: (name: string) => (h.registered.push(name), {
    setItem: h.setItem,
    removeItem: h.removeItem,
    getItem: h.getItem,
    reloadAllTimelines: h.reloadAllTimelines,
    reloadTimelines: h.reloadTimelines,
  }),
}));

import {
  mirrorSiloToWidget,
  WIDGET_GROUP,
} from "../widgetBridge";
import { WIDGET_KIND } from "../widgetSnapshot";

beforeEach(() => {
  vi.clearAllMocks();
  h.native = true;
  h.platform = "ios";
});

describe("native widget state bridge", () => {
  it("writes the active silo to the same App Group", async () => {
    await mirrorSiloToWidget("BI");
    expect(h.setItem).toHaveBeenCalledWith({
      group: "group.com.borealfinancial.portal",
      key: "widget_active_silo",
      value: "BI",
    });
    expect(h.reloadAllTimelines).toHaveBeenCalledOnce();
  });

  it.each([{ native: false, platform: "ios" }, { native: true, platform: "android" }])(
    "makes no plugin calls on $platform (native=$native)",
    async ({ native, platform }) => {
      h.native = native;
      h.platform = platform;
      await mirrorSiloToWidget("BI");
      expect(h.setItem).not.toHaveBeenCalled();
      expect(h.removeItem).not.toHaveBeenCalled();
      expect(h.reloadAllTimelines).not.toHaveBeenCalled();
    },
  );

  it("swallows native failures so authentication is not rejected", async () => {
    h.setItem.mockRejectedValueOnce(new Error("bridge unavailable"));
    await expect(mirrorSiloToWidget("BF")).resolves.toBeUndefined();
  });
});

describe("native side matches what the JS calls", () => {
  it("does not use Capacitor Preferences for widget storage", async () => {
    await mirrorSiloToWidget("BI");
    await mirrorSiloToWidget(null);
    expect(h.preferences).not.toHaveBeenCalled();
    expect(h.setItem).toHaveBeenCalledTimes(1);
    expect(h.removeItem).toHaveBeenCalledWith({ group: WIDGET_GROUP, key: "widget_active_silo" });
  });

  it("uses the matching WidgetKit kind", () => {
    expect(WIDGET_KIND).toBe("BorealPortalSummary");
    const kinds = Array.from(summaryWidgetSwift.matchAll(/kind:\s*"([^"]+)"/g), (m) => m[1]);
    expect(kinds).toContain(WIDGET_KIND);
  });

  it("the plugin the JS registers exists natively with every method the JS calls", () => {
    expect(h.registered).toContain("WidgetBridgePlugin");
    expect(pluginSwift).toMatch(/jsName = "WidgetBridgePlugin"/);
    const methods = Array.from(pluginSwift.matchAll(/CAPPluginMethod\(name: "(\w+)"/g), (m) => m[1]);
    expect(methods).toEqual(expect.arrayContaining(["setItem", "removeItem", "getItem", "reloadAllTimelines", "reloadTimelines"]));
  });

  it("opens App Group defaults (the group the app is entitled to) and can refresh all WidgetKit timelines", () => {
    expect(pluginSwift).toContain("UserDefaults(suiteName:");
    expect(pluginSwift).not.toContain("UserDefaults.standard");
    expect(pluginSwift).toContain("WidgetCenter.shared.reloadAllTimelines()");
    expect(entitlements).toContain(`<string>${WIDGET_GROUP}</string>`);
  });

  it("registers a plugin instance from the custom bridge controller", () => {
    expect(bridgeSwift).toContain("registerPluginInstance(WidgetBridgePlugin())");
    expect(bridgeSwift).not.toContain("registerPluginType");
  });

  it("compiles both bridge files in the App source phase only", () => {
    const appSources = pbxproj.match(/\n\t\t504EC3001FED79650016851F \/\* Sources \*\/ = \{[\s\S]*?runOnlyForDeploymentPostprocessing = 0;/)?.[0] ?? "";
    const widgetSources = pbxproj.match(/\n\t\tB0EA29000000000000000010 \/\* Sources \*\/ = \{[\s\S]*?runOnlyForDeploymentPostprocessing = 0;/)?.[0] ?? "";
    expect(appSources).toContain("WidgetBridgePlugin.swift in Sources");
    expect(appSources).toContain("BorealBridgeViewController.swift in Sources");
    expect(widgetSources).not.toBe("");
    expect(widgetSources).not.toContain("WidgetBridgePlugin.swift");
    expect(widgetSources).not.toContain("BorealBridgeViewController.swift");
  });
});
