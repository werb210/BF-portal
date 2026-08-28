import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const h = vi.hoisted(() => ({
  native: true,
  platform: "ios",
  setItem: vi.fn(async () => {}),
  removeItem: vi.fn(async () => {}),
  getItem: vi.fn(async () => ({ value: null as string | null })),
  reloadAllTimelines: vi.fn(async () => {}),
  reloadTimelines: vi.fn(async () => {}),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => h.native,
    getPlatform: () => h.platform,
  },
  registerPlugin: () => ({
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

beforeEach(() => {
  vi.clearAllMocks();
  h.native = true;
  h.platform = "ios";
});

describe("native widget state bridge", () => {
  it("writes the active silo to the same App Group", async () => {
    await mirrorSiloToWidget("BI");
    expect(h.setItem).toHaveBeenCalledWith({
      group: "group.com.boreal.portal",
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

describe("source regressions", () => {
  const source = (relativePath: string) =>
    readFileSync(path.join(process.cwd(), relativePath), "utf8");

  it("does not use Capacitor Preferences for widget storage", () => {
    const bridge = source("src/native/widgetBridge.ts");
    expect(bridge).not.toContain("Preferences.configure");
    expect(bridge).not.toContain("@capacitor/preferences");
  });

  it("uses the matching WidgetKit kind", () => {
    expect(source("src/native/widgetSnapshot.ts")).toContain(
      'WIDGET_KIND = "BorealPortalSummary"',
    );
  });

  it("opens App Group defaults and can refresh all WidgetKit timelines", () => {
    const swift = source("ios/App/App/WidgetBridgePlugin.swift");
    expect(swift).toContain("UserDefaults(suiteName:");
    expect(swift).not.toContain("UserDefaults.standard");
    expect(swift).toContain("WidgetCenter.shared.reloadAllTimelines()");
  });

  it("registers a plugin instance from the custom bridge controller", () => {
    const swift = source("ios/App/App/BorealBridgeViewController.swift");
    expect(swift).toContain("registerPluginInstance(WidgetBridgePlugin())");
    expect(swift).not.toContain("registerPluginType");
  });

  it("compiles both bridge files in the App source phase only", () => {
    const project = source("ios/App/App.xcodeproj/project.pbxproj");
    const appSources = project.match(/\n\t\t504EC3001FED79650016851F \/\* Sources \*\/ = \{[\s\S]*?runOnlyForDeploymentPostprocessing = 0;/)?.[0] ?? "";
    const widgetSources = project.match(/\n\t\tB0EA29000000000000000010 \/\* Sources \*\/ = \{[\s\S]*?runOnlyForDeploymentPostprocessing = 0;/)?.[0] ?? "";
    expect(appSources).toContain("WidgetBridgePlugin.swift in Sources");
    expect(appSources).toContain("BorealBridgeViewController.swift in Sources");
    expect(widgetSources).not.toContain("WidgetBridgePlugin.swift");
    expect(widgetSources).not.toContain("BorealBridgeViewController.swift");
  });
});
